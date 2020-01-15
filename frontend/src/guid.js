
export function w(e, t, n) {
  var r = t && n || 0;
  "string" == typeof e && (t = "binary" == e ? new Array(16) : null,
    e = null),
    e = e || {};
  var o = e.random || (e.rng || i)();
  if (o[6] = 15 & o[6] | 64,
    o[8] = 63 & o[8] | 128,
    t)
    for (var s = 0; s < 16; ++s)
      t[r + s] = o[s];
  return t || a(o)
}
// var i = n(783)
//   , a = n(782);
