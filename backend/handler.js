'use strict';

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const SSM = new AWS.SSM();

const sessionType = 'ssm-session';
module.exports.trailSsmSessionStart = async event => {
  console.log(`:: event`, JSON.stringify(event));
  // const message = JSON.parse(event.Records[0].Sns.Message);
  // if (message.detail.eventName !== 'StartSession') {
  //   return;
  // }
  const message = event;
  const eventTime = new Date(message.detail.eventTime);
  console.log(`:: eventTime`, eventTime);
  const sessionId = message.detail.responseElements.sessionId;
  const sessionTimeoutSeconds = process.env.SessionTimeoutSeconds;
  const expiresAt = eventTime.valueOf() + (sessionTimeoutSeconds * 1000);
  console.log(`:: sessionId, expiresAt,`, sessionId, Date.now(), expiresAt, new Date(expiresAt));

  await docClient.put({
    TableName: process.env.SessionsTableName,
    Item: {
      sessionId,
      expiresAt,
      sessionType,
      message
    }
  }).promise();

  return true;
};


module.exports.killExpiredSessions = async event => {
  // query for expired events
  const sessions = await docClient.query({
    TableName: process.env.SessionsTableName,
    IndexName: process.env.SessionsTableExpiresIndexName,
    KeyConditionExpression: 'sessionType = :stype AND expiresAt <= :expat',
    ExpressionAttributeValues: {
      ':stype': sessionType,
      ':expat': Date.now()
    }
  }).promise();
  console.log(`:: sessions`, sessions.Items.map(s => { return { sId: s.sessionId, eAt: s.expiresAt }}));

  // iterate and delete SSM sessions for each
  const expiredSessions = sessions.Items;
  for (let index = 0; index < expiredSessions.length; index++) {
    try {
      const session = expiredSessions[index];
      const sessionId = session.sessionId;
      console.log(`:: Killing sessionId`, sessionId);

      const killed = await SSM.terminateSession({
        SessionId: sessionId
      }).promise();
      console.log(`:: Killed session ${sessionId}`, killed);

      const sessionRecordDeleted = await docClient.delete({
        TableName: process.env.SessionsTableName,
        Key: {
          sessionId,
          expiresAt: session.expiresAt
        }
      }).promise();
      console.log(`:: sessionRecordDeleted`, sessionRecordDeleted);
    } catch (e) {
      console.error(e, JSON.stringify(e));
    }
  }

}