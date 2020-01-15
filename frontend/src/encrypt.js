// function(e, t, n) {
//   "use strict";
//   (function (e) {
//     function r(e, t, n) {
//       return m(this, void 0, void 0, regeneratorRuntime.mark(function r() {
//         var i, a, o;
//         return regeneratorRuntime.wrap(function (r) {
//           for (; ;)
//             switch (r.prev = r.next) {
//               case 0:
//                 return i = {},
//                   i[p.r] = t,
//                   n && (i[p.s] = n),
//                   a = {
//                     KeyId: e,
//                     NumberOfBytes: p.t,
//                     EncryptionContext: i
//                   },
//                   r.prev = 4,
//                   r.next = 7,
//                   h.generateDataKey(a).promise();
//               case 7:
//                 return o = r.sent,
//                   r.abrupt("return", {
//                     ciphertextBlob: o.CiphertextBlob,
//                     plainTextKey: o.Plaintext
//                   });
//               case 11:
//                 return r.prev = 11,
//                   r.t0 = r.catch(4),
//                   r.abrupt("return", {
//                     errorMessage: r.t0.toString()
//                   });
//               case 14:
//               case "end":
//                 return r.stop()
//             }
//         }, r, this, [[4, 11]])
//       }))
//     }
//     function i(e, t, i) {
//       return m(this, void 0, void 0, regeneratorRuntime.mark(function a() {
//         var o, s, u, l, c, m, h, f, y, g;
//         return regeneratorRuntime.wrap(function (a) {
//           for (; ;)
//             switch (a.prev = a.next) {
//               case 0:
//                 if (o = {},
//                   s = {
//                     ClientVersion: "placeholder_client_ver",
//                     ProcessedClientActions: []
//                   },
//                   u = void 0,
//                   e.ActionType !== p.u) {
//                   a.next = 11;
//                   break
//                 }
//                 return l = e.ActionParameters,
//                   a.next = 7,
//                   r(l.KMSKeyId, t, i);
//               case 7:
//                 c = a.sent,
//                   c.errorMessage ? (u = {
//                     ActionType: e.ActionType,
//                     ActionStatus: p.v.Failed,
//                     Error: c.errorMessage
//                   },
//                     s.ProcessedClientActions = [u],
//                     o.handshakeResponse = s) : (m = c.plainTextKey) instanceof Uint8Array && c.ciphertextBlob && c.ciphertextBlob instanceof Uint8Array && (h = m.slice(0, p.w),
//                       f = m.slice(p.w),
//                       y = n.i(d.l)(c.ciphertextBlob),
//                       g = {
//                         KMSCipherTextKey: y
//                       },
//                       u = {
//                         ActionType: e.ActionType,
//                         ActionStatus: p.v.Success,
//                         ActionResult: g
//                       },
//                       s.ProcessedClientActions = [u],
//                       o.decryptionKey = h,
//                       o.encryptionKey = f,
//                       o.handshakeResponse = s),
//                   a.next = 11;
//                 break;
//               case 11:
//                 return a.abrupt("return", o);
//               case 12:
//               case "end":
//                 return a.stop()
//             }
//         }, a, this)
//       }))
//     }
//     function a(t, r, i) {
//       var a = t.Challenge
//         , u = new e(a, "base64")
//         , l = s(r, u)
//         , c = o(i, l);
//       return {
//         Challenge: n.i(d.l)(c)
//       }
//     }
//     function o(t, n) {
//       var r = l.randomBytes(12)
//         , i = l.createCipheriv(p.x, t, r);
//       return e.concat([r, i.update(n), i.final(), i.getAuthTag()])
//     }
//     function s(t, n) {
//       var r = new e(n)
//         , i = r.slice(0, 12)
//         , a = r.slice(12, -16)
//         , o = r.slice(-16)
//         , s = l.createDecipheriv(p.x, t, i);
//       s.setAuthTag(o);
//       var u = s.update(a);
//       return u = e.concat([u, s.final()])
//     }
//     var u = n(90)
//       , l = (n.n(u),
//         n(410))
//       , c = (n.n(l),
//         n(220))
//       , p = n(130)
//       , d = n(347);
//     t.c = i,
//       t.d = a,
//       t.b = o,
//       t.a = s;
//     var m = this && this.__awaiter || function (e, t, n, r) {
//       return new (n || (n = Promise))(function (i, a) {
//         function o(e) {
//           try {
//             u(r.next(e))
//           } catch (e) {
//             a(e)
//           }
//         }
//         function s(e) {
//           try {
//             u(r.throw(e))
//           } catch (e) {
//             a(e)
//           }
//         }
//         function u(e) {
//           e.done ? i(e.value) : new n(function (t) {
//             t(e.value)
//           }
//           ).then(o, s)
//         }
//         u((r = r.apply(e, t || [])).next())
//       }
//       )
//     }
//       , h = n.i(u.pick)(c.a, ["generateDataKey"])
//   }
//   ).call(t, n(4).Buffer)
// }