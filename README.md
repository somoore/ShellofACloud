# Shell of A Cloud - Deployment Guide

## Purpose 
Shell of A Cloud helps you take the [AWS SSM Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) web-based terminal and embed it into your own projects, quickly and easily.  This deployment guide and associated code will help you create a clone of [https://www.shellofa.cloud](https://www.shellofa.cloud). From here, you can customize to your liking, swap out authentication methods, use internally, etc.

**Features**
- Use the [AWS Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) terminal outside of AWS console, CLI and plugin in your own Public or Private projects.
- Integrates with [Auth0](https://auth0.com/)
- StartSession based on tag via web UI with a click of a button
- Session handling with 'auto-terminate' of SSM sessions

**High-Level Flow** 

-   User navigates to secure website hosted on CloudFront that is backed by a S3 website bucket.
-   User authenticates using the Auth0 widget configured with required identity providers.
-   Auth0 issues OpenID Connect (OIDC) tokens for the authenticated user.
-   Client connects to Cognito Identity Pool to trade OIDC tokens for temporary AWS credentials mapped to an IAM role that has permissions to connect to AWS SSM.
-   Client uses the temporary AWS credentials to connect to SSM Session Manager and then starts a new session over a WebSocket connection.
![Shell of a Cloud Diagram](https://shellofacloud-images.s3.amazonaws.com/ShellOfACloud.jpg)
# Getting Started
**Prerequisites**  
- AWS Account | If new to AWS, sign up [here](https://aws.amazon.com/)
- Auth0 | Free plan will suffice for this proof of concept. Signup [here](https://auth0.com/) 
- AWS CLI | Download [here](https://aws.amazon.com/cli/)
- Serverless Framework (Open Source version) | Get started [here](https://serverless.com/framework/docs/getting-started/)

# Front-End Deployment Instructions:

1.  Login to your AWS account.
2. Create a new S3 bucket meant for hosting the website code assets. Since this is going to be publicly accessible, you’ll need to disable the Block Public Access settings.
3. Enable website hosting for the S3 bucket and make a note of the website URL.
4. Create a new CloudFront distribution with the S3 website as the Origin.
5.  Map your domain name from Route53 and corresponding SSL certificate from ACM.
- **Note: Auth0 client SDK requires to be hosted on a secure (HTTPS) website.**

## Auth0 Setup

1.  Login to your Auth0 tenant account. You can sign-up for a new Auth0 account free trial.
2.  Create a new Auth0 application with Application Type as Single Page Application.
3. Make a note of the ClientID and Client Secret values.
4. Whitelist the Callback URLs as the hosting website and Allowed Web Origin as your Auth0 domain.
5. In the Connections section, set up any Database and/or Social identity providers that you’d like users to authenticate with.

## Cognito Identity Pool Setup

1.   Refer detailed steps [here](https://auth0.com/docs/integrations/integrating-auth0-amazon-cognito-mobile-apps%22%20%5Cl%20%22create-a-new-openid-connect-provider)
2. Login to your AWS console and go to the IAM section.
3. Create a new Identity Provider using the Auth0 domain URL and ClientID
4.   In the AWS Console, navigate to the Cognito section.
5.   Create a new Identity Pool with desired name.
- **For the authenticated role, provide the following policy permissions:**

![enter image description here](https://shellofacloud-images.s3.amazonaws.com/soac-perms.png)

-  Provide the Auth0 domain previously set up as an OpenID Authentication Provider.
-  Save the Cognito Identity Pool and make a note of its ARN.

## Code Deployment

-   Pre-requisites –
-   Node.js LTS 10.x or higher, (with NPM 6+)
-   Git client configured with appropriate credentials to access the repo.
-   (Optional) Serverless framework v1.55 or higher.
			`npm install -g serverless`
  
- Open a terminal shell on your local machine and follow the steps below -
- Clone the repo.
 `git clone https://github.com/somoore/ShellofACloud.git`

-  Install the required dependencies.

	  `cd ./frontend && npm install`
-  Edit the environment config file (frontend/.env) to match your environment.

 

       CognitoIdentityPoolRegion=**_us-east-1_**
       CognitoIdentityPoolId=**_us-east-1:xxxx-yyyy-xx-zzzz_**
       IdpDomainName=**_your_Auth0_domain.auth0.com_**  

-   Build the website
 `npm run build`

-  Deploy the website using Serverless Framework and the serverless-finch plugin

-  Edit the following setting in the config file (frontend/serverless.yml):![enter image description here](https://shellofacloud-images.s3.amazonaws.com/yamledit.png)

-  Edit *auth_config.json* in (frontend/src/auth):

	    { 
	    "domain": "insertAuth0Domainhere",
	    "clientID": "insertAuth0ClientIDhere"
	    }        


## Front-End Testing

-  Deploy one or more EC2 instances in your AWS account. ***Note: Both Windows & Linux are supported.***
-  Assign them an Instance profile with SSM Session Manager permissions. [Reference](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html).
-  Ensure that these instances show up as Managed Instances in the SSM Console and that you can start a session directly from the console.
-  Navigate to the CloudFront website and try logging in using the Auth0 login dialog.
-  The managed instances should show up with a Connect card for each eligible target.
-  Hit the Connect button to start a new session to the target instance.
-  Once connected, try issuing some shell commands.
-  The session should automatically disconnect after some time.
-  To manually disconnect, use the Disconnect button.


# (Optional) Serverless Backend 
Starting sessions from the web UI will create a lot of clutter in the AWS SSM Session Manager 'session manager' connections section. This backend adds a 90 second session expiry timer (user configurable) which terminates SSM sessions for the targeted EC2 instance. In addition, a 'disconnect' button can be clicked on the web UI front-end which manually terminates the sessions as well. 

## High-Level Flow

- Every SSM Session Start API call is captured automatically by CloudTrail.
- CloudWatch Events Rule is triggered on this AWS API call using CloudTrail.
- The target of the CloudWatch Events Rule is a Lambda function that records the session start in a DynamoDB table along with a computed expiration time.
- Another CloudWatch Events Rule runs every minute and triggers another Lambda function to poll the DynamoDB table for expired sessions.
- The Lambda function invokes SSM API to terminate any sessions that may have not been automatically terminated from the frontend.

# Back-End Deployment Instructions

## CloudTrail Setup

- Login to your AWS account and navigate to the CloudTrail section.
- Enable a new trail delivered to a S3 bucket.

## Backend Deployment (Lambda functions & DynamoDB table)

- Requires Serverless framework to be installed on your local machine.
- Open a terminal shell on your local machine and run the following commands -
- Install dependencies
`cd ./backend && npm install`
- Deploy the backend using Serverless Framework
- Edit the following setting in the config file (backend/serverless.yml)
![enter image description here](https://shellofacloud-images.s3.amazonaws.com/backend-yaml.png)
- Run the following script to deploy.
`serverless deploy -v`

## Back-End Testing

- Start a new session from the deployed website and close the browser window without terminating the session.
- Observe that the session shows up in the SSM Session Manager.
- Check the DynamoDB table for a new record corresponding to the same session.
- After a couple of minutes, the session should get automatically terminated from SSM Session Manager and the record is deleted from the DynamoDB table.

# Security 
Practice the Principle of Least Privilege when working in AWS. 
- **Restrict IAM Policies** 
-- Review your IAM Role policies for any Action/Resource * [asterisks], ensure you have restricted access via policy as much as possible. 
-- Ben Layer of TripWire, dives into the pitfalls of using default IAM role permissions as they relate to SSM [here](https://www.tripwire.com/state-of-security/security-data-protection/cloud/aws-system-manager-default-permissions/).

- **Avoiding SSRF**
-- Arm yourself with knowledge from real-world scenarios. J Cole Morrison [gives](https://start.jcolemorrison.com/the-technical-side-of-the-capital-one-aws-security-breach/) a great analysis on a recent breach.

- **IMDSv2** 
-- Announced on 11/19/2019 to help secure [ ](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html) requests via session authentication. To read more click [here](https://aws.amazon.com/blogs/security/defense-in-depth-open-firewalls-reverse-proxies-ssrf-vulnerabilities-ec2-instance-metadata-service/)

#	Want to Contribute? Submit a [PR!](https://github.com/somoore/ShellofACloud/pulls) Have an Issue? [Let us know!](https://github.com/somoore/ShellofACloud/issues/new)
