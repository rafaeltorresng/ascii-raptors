// src/math.ts
var e = Math.PI * 2, t = (e, t, n) => Math.max(t, Math.min(n, e)), n = (e, t, n) => e + (t - e) * n, r = (e, n, r) => {
	let i = t((r - e) / (n - e), 0, 1);
	return i * i * (3 - 2 * i);
}, i = (e = 0, t = 0, n = 0) => ({
	x: e,
	y: t,
	z: n
}), a = (e, t) => i(e.x - t.x, e.y - t.y, e.z - t.z), o = (e, t) => i(e.y * t.z - e.z * t.y, e.z * t.x - e.x * t.z, e.x * t.y - e.y * t.x);
function s(e) {
	let t = Math.hypot(e.x, e.y, e.z) || 1;
	return i(e.x / t, e.y / t, e.z / t);
}
function c(e, t) {
	let n = Math.cos(t), r = Math.sin(t);
	return i(e.x, e.y * n - e.z * r, e.y * r + e.z * n);
}
function l(e, t) {
	let n = Math.cos(t), r = Math.sin(t);
	return i(e.x * n + e.z * r, e.y, -e.x * r + e.z * n);
}
function u(e, t) {
	let n = Math.cos(t), r = Math.sin(t);
	return i(e.x * n - e.y * r, e.x * r + e.y * n, e.z);
}
function d(e, t, n, r = 0) {
	let o = l(u(a(e, t), r), n);
	return i(o.x + t.x, o.y + t.y, o.z + t.z);
}
function f(e) {
	return e = Math.imul(e ^ e >>> 16, 73244475), e = Math.imul(e ^ e >>> 16, 73244475), (e ^ e >>> 16) >>> 0;
}
// src/bird.ts
var p = i(.22, .3, .025), m = i(1.02, .39, .025), h = i(1.7, .65, .025);
function g(e, t, n) {
	let a = e, o = r(h.x - .08, h.x + .08, e.x), s = r(m.x - .08, m.x + .08, e.x);
	return a = d(a, h, -n.tip * o, -n.fold * .85 * o), a = d(a, m, -n.elbow * s, -n.fold * s), a = d(a, p, -n.lift + t * n.bank * .035), i(a.x * t, a.y, a.z);
}
function _() {
	let e = [], t = [], r = 1, s = (t, n, r, i, a) => (e.push({
		point: t,
		u: n,
		v: r,
		side: i,
		region: a
	}), e.length - 1), c = (n, r, i, s, c) => {
		(e[n].region === "wing" || e[n].region === "tail") && o(a(e[r].point, e[n].point), a(e[i].point, e[n].point)).z < 0 && ([r, i] = [i, r]), t.push({
			a: n,
			b: r,
			c: i,
			material: s,
			id: c
		});
	};
	function l(t, n, a, o, l = 12, u = 20) {
		let d = e.length, f = r++;
		for (let e = 0; e <= l; e++) {
			let r = Math.PI * e / l;
			for (let a = 0; a <= u; a++) {
				let c = Math.PI * 2 * a / u;
				s(i(t.x + n.x * Math.sin(r) * Math.cos(c), t.y + n.y * Math.cos(r), t.z + n.z * Math.sin(r) * Math.sin(c)), a / u, e / l, 0, o);
			}
		}
		for (let e = 0; e < l; e++) for (let t = 0; t < u; t++) {
			let n = d + e * (u + 1) + t, r = n + u + 1;
			c(n, n + 1, r, a, f), c(r, n + 1, r + 1, a, f);
		}
	}
	function u(t, a, o, l, u, d, f = 0) {
		let p = e.length, m = r++, h = a.x - t.x, g = a.y - t.y, _ = Math.hypot(h, g), v = -g / _, y = h / _;
		for (let e = 0; e <= 7; e++) {
			let r = e / 7, c = o * Math.sin(Math.PI * (.035 + r * .965)) ** .48 * (1 - r * .18);
			for (let e = 0; e <= 4; e++) {
				let o = e / 4 * 2 - 1;
				s(i(n(t.x, a.x, r) + v * c * o + f * Math.sin(Math.PI * r), n(t.y, a.y, r) + y * c * o, n(t.z, a.z, r) + (1 - o * o) * Math.sin(Math.PI * r) * .018), r, o * .5 + .5, l, u);
			}
		}
		for (let e = 0; e < 7; e++) for (let t = 0; t < 4; t++) {
			let n = p + e * 5 + t, r = n + 4 + 1;
			c(n, n + 1, r, d, m), c(r, n + 1, r + 1, d, m);
		}
	}
	for (let e of [-1, 1]) for (let t = 5; t >= 0; t--) {
		let n = t / 5;
		u(i(.025 + t * .025, -.41, .008), i(.025 + n * .36, -.98 - .93 * n ** 1.12, .025), .068 + n * .009, e, "tail", "flight", .025);
	}
	for (let e of [-1, 1]) {
		for (let t = 0; t < 13; t++) {
			let r = t / 12, a = n(.3, 1.63, r);
			u(i(a + .055, .34 + r * .26, .005), i(a - .075, -.18 - .13 * Math.sin(r * Math.PI), -.014), .073, e, "wing", "flight");
		}
		let t = [
			i(1.42, -.26, 0),
			i(1.59, -.29, 0),
			i(1.77, -.3, 0),
			i(1.96, -.28, 0),
			i(2.15, -.22, 0),
			i(2.33, -.13, 0),
			i(2.49, -.01, 0),
			i(2.65, .08, 0),
			i(2.79, .14, 0),
			i(2.89, .16, 0)
		];
		for (let n = 0; n < t.length; n++) {
			let r = n / 9;
			u(i(1.44 + r * .33, .54 + r * .11, .012), t[n], .085 - r * .03, e, "wing", "flight", -.02);
		}
		let a = [
			i(.18, .4, .045),
			i(.55, .51, .045),
			i(1.02, .57, .045),
			i(1.7, .76, .045),
			i(2.07, .65, .025),
			i(2.45, .44, .014),
			i(2.89, .16, .008)
		], o = [
			i(.22, -.13, .035),
			i(.55, -.1, .035),
			i(1.02, -.03, .035),
			i(1.7, .18, .035),
			i(2.07, .28, .024),
			i(2.45, .33, .014),
			i(2.89, .16, .008)
		], l = r++;
		for (let t = 0; t < a.length - 1; t++) {
			let n = s(a[t], t / 6, 0, e, "wing"), r = s(o[t], t / 6, 1, e, "wing"), i = s(a[t + 1], (t + 1) / 6, 0, e, "wing"), u = s(o[t + 1], (t + 1) / 6, 1, e, "wing"), d = t >= 3 ? "flight" : "lining";
			c(n, r, i, d, l), c(r, u, i, d, l);
		}
		for (let t = 0; t < 12; t++) {
			let n = t / 11, r = .35 + n * 1.38;
			u(i(r, .4 + n * .22, .056), i(r - .045, .015 + n * .19, .058), .069, e, "wing", "lining");
		}
	}
	l(i(0, .08, 0), i(.205, .59, .19), "white", "body"), l(i(0, .13, .115), i(.175, .44, .095), "back", "body"), l(i(0, .48, .015), i(.128, .28, .125), "white", "head"), l(i(0, .72, .045), i(.142, .19, .14), "white", "head"), l(i(0, .905, .018), i(.069, .095, .055), "beak", "head", 7, 12), l(i(0, .957, -.024), i(.039, .042, .061), "beak", "head", 6, 10);
	for (let e of [-1, 1]) l(i(e * .13, .77, .075), i(.024, .025, .024), "eye", "head", 5, 8);
	return {
		vertices: e,
		faces: t
	};
}
function v(e, t, n, r = !1) {
	let o = n ?? new Float32Array(e.vertices.length * 3);
	for (let n = 0; n < e.vertices.length; n++) {
		let s = e.vertices[n], d;
		s.region === "wing" ? d = g(s.point, s.side, t) : s.region === "tail" ? (d = i(s.point.x * s.side * t.tailSpread, s.point.y + .42, s.point.z), d = u(c(d, t.tailPitch), t.tailYaw), d.y -= .42) : s.region === "head" ? (d = c(l(a(s.point, i(0, .44, 0)), -t.bank * .65), -t.pitch * .6), d.y += .44) : d = s.point, d = u(c(l(d, r ? 0 : t.bank), t.pitch), t.yaw);
		let f = n * 3;
		o[f] = d.x + t.x, o[f + 1] = d.y + t.y, o[f + 2] = (r ? 0 : d.z) + t.z;
	}
	return {
		positions: o,
		faces: e.faces
	};
}
// src/flight.ts
function y(i, a = "soar", o = 7) {
	let s = Math.max(0, i), c = o % 101 * .037, l = (s * 1.32 + .08) % 1, u = (s + 4) % 19 - 13, d = r(0, .8, u) * (1 - r(2.8, 3.8, u)), f = a === "flap" ? 1 : a === "glide" ? 0 : d, p = n(.67, -.67, l < .43 ? r(0, .43, l) : 1 - r(.43, 1, l)), m = Math.sin(e * l - .5), h = -.29 + .4 * Math.sin(s * .145 + c) + .11 * Math.sin(s * .31), g = .058 * Math.cos(s * .145 + c) + .0341 * Math.cos(s * .31), _ = t(-g * 4.8, -.48, .48);
	return {
		time: s,
		yaw: h,
		bank: _,
		curvature: g,
		activity: f,
		pitch: .025 + .025 * Math.sin(s * .29) + f * .014 * Math.sin(e * l),
		lift: .025 * Math.sin(s * .73) + f * p,
		elbow: f * .16 * m,
		tip: f * .23 * Math.sin(e * l - 1.1) + .035 * Math.sin(s * 1.15),
		fold: f * .18 * r(-.15, .8, m),
		tailSpread: .9 + .1 * Math.sin(s * .49) + Math.abs(_) * .3,
		tailYaw: _ * -.25 + .035 * Math.sin(s * .91 + c),
		tailPitch: .045 + .028 * Math.sin(s * .61) - f * p * .05,
		x: .13 * Math.sin(s * .145 + c),
		y: .07 * Math.sin(s * .23),
		z: .035 * Math.sin(s * .37)
	};
}
function b(e, t, n = e.bank) {
	return {
		...e,
		yaw: t,
		bank: n
	};
}
function x(e, t, i) {
	let a = r(0, 1, i), o = { ...t };
	for (let r of Object.keys(t)) o[r] = n(e[r], t[r], a);
	return o;
}
// src/species/mesh.ts
var S = class {
	mesh = {
		vertices: [],
		faces: []
	};
	id = 1;
	vertex(e, t, n, r, i) {
		return this.mesh.vertices.push({
			point: e,
			u: t,
			v: n,
			side: r,
			region: i
		}), this.mesh.vertices.length - 1;
	}
	triangle(e, t, n, r, i) {
		let s = this.mesh.vertices;
		(s[e].region === "wing" || s[e].region === "tail") && o(a(s[t].point, s[e].point), a(s[n].point, s[e].point)).z < 0 && ([t, n] = [n, t]), this.mesh.faces.push({
			a: e,
			b: t,
			c: n,
			material: r,
			id: i
		});
	}
	ellipsoid(e, t, n, r, a = 10, o = 16) {
		let s = this.mesh.vertices.length, c = this.id++;
		for (let n = 0; n <= a; n++) for (let s = 0; s <= o; s++) {
			let c = Math.PI * n / a, l = Math.PI * 2 * s / o;
			this.vertex(i(e.x + t.x * Math.sin(c) * Math.cos(l), e.y + t.y * Math.cos(c), e.z + t.z * Math.sin(c) * Math.sin(l)), s / o, n / a, 0, r);
		}
		for (let e = 0; e < a; e++) for (let t = 0; t < o; t++) {
			let r = s + e * (o + 1) + t, i = r + o + 1;
			this.triangle(r, r + 1, i, n, c), this.triangle(i, r + 1, i + 1, n, c);
		}
	}
	feather(e, t, r, a, o, s, c = 0) {
		let l = this.mesh.vertices.length, u = this.id++, d = t.x - e.x, f = t.y - e.y, p = Math.hypot(d, f), m = -f / p, h = d / p;
		for (let s = 0; s <= 7; s++) {
			let l = s / 7, u = r * Math.sin(Math.PI * (.035 + l * .965)) ** .48 * (1 - l * .18);
			for (let r = 0; r <= 4; r++) {
				let s = r / 4 * 2 - 1;
				this.vertex(i(n(e.x, t.x, l) + m * u * s + c * Math.sin(Math.PI * l), n(e.y, t.y, l) + h * u * s, n(e.z, t.z, l) + (1 - s * s) * Math.sin(Math.PI * l) * .022), l, s * .5 + .5, a, o);
			}
		}
		for (let e = 0; e < 7; e++) for (let t = 0; t < 4; t++) {
			let n = l + e * 5 + t, r = n + 4 + 1;
			this.triangle(n, n + 1, r, s, u), this.triangle(r, n + 1, r + 1, s, u);
		}
	}
	panel(e, t, n, r) {
		let i = this.id++;
		for (let a = 0; a < e.length - 1; a++) {
			let o = this.vertex(e[a], a / (e.length - 1), 0, n, "wing"), s = this.vertex(t[a], a / (e.length - 1), 1, n, "wing"), c = this.vertex(e[a + 1], (a + 1) / (e.length - 1), 0, n, "wing"), l = this.vertex(t[a + 1], (a + 1) / (e.length - 1), 1, n, "wing");
			this.triangle(o, s, c, r, i), this.triangle(s, l, c, r, i);
		}
	}
};
// src/species/rig.ts
function C(e, t, n, a) {
	let o = r(a.wrist.x - .08, a.wrist.x + .08, e.x), s = r(a.elbow.x - .08, a.elbow.x + .08, e.x), c = d(e, a.wrist, -n.tip * o, -n.fold * a.wristSweep * o);
	return c = d(c, a.elbow, -n.elbow * s, -n.fold * a.elbowSweep * s), c = d(c, a.shoulder, -n.lift + t * n.bank * .025), i(c.x * t, c.y, c.z);
}
function w(e, t, n, r, o = !1) {
	let s = r ?? new Float32Array(e.vertices.length * 3);
	for (let r = 0; r < e.vertices.length; r++) {
		let d = e.vertices[r], f;
		d.region === "wing" ? f = C(d.point, d.side, t, n) : d.region === "tail" ? (f = i(d.point.x * d.side * t.tailSpread, d.point.y - n.tailAnchor, d.point.z), f = u(c(f, t.tailPitch), t.tailYaw), f.y += n.tailAnchor) : d.region === "head" ? (f = a(d.point, i(0, n.headAnchor, 0)), f = c(l(f, -t.bank * n.headStabilization), -t.pitch * .55), f.y += n.headAnchor) : f = d.point, f = u(c(l(f, o ? 0 : t.bank), t.pitch), t.yaw), s[r * 3] = f.x + t.x, s[r * 3 + 1] = f.y + t.y, s[r * 3 + 2] = (o ? 0 : f.z) + t.z;
	}
	return {
		positions: s,
		faces: e.faces
	};
}
// src/species/golden-eagle.ts
var T = {
	shoulder: i(.25, .26, .04),
	elbow: i(1.3, .52, .04),
	wrist: i(2.15, .49, .04),
	elbowSweep: .65,
	wristSweep: .7,
	headAnchor: .53,
	tailAnchor: -.58,
	headStabilization: .5
};
function E() {
	let e = new S();
	for (let t of [-1, 1]) {
		for (let n = 5; n >= 0; n--) {
			let r = n / 5;
			e.feather(i(.015 + r * .13, -.54, .005), i(.035 + r * .49, -1.57 + r * r * .17, .012), .087, t, "tail", "eagle-flight");
		}
		for (let r = 0; r < 18; r++) {
			let a = r / 17, o = n(.32, 2.15, a);
			e.feather(i(o + .04, .41 + .17 * Math.sin(a * Math.PI), .004), i(o - .15, -.49 - .22 * Math.sin(a * Math.PI), -.025), .091, t, "wing", "eagle-flight");
		}
		let r = [
			i(1.94, -.63, 0),
			i(2.15, -.75, 0),
			i(2.38, -.85, 0),
			i(2.65, -.89, 0),
			i(2.93, -.81, .02),
			i(3.18, -.59, .045),
			i(3.4, -.27, .075),
			i(3.53, .08, .105),
			i(3.48, .42, .13),
			i(3.3, .7, .14)
		];
		for (let n = 0; n < r.length; n++) {
			let a = n / 9;
			e.feather(i(1.88 + a * .42, .39 + a * .14, .016), r[n], .126 - a * .035, t, "wing", "eagle-flight", .025);
		}
		e.panel([
			i(.22, .38, .055),
			i(.7, .58, .055),
			i(1.3, .74, .06),
			i(2.15, .65, .055),
			i(2.48, .48, .04)
		], [
			i(.24, -.28, .04),
			i(.7, -.34, .04),
			i(1.3, -.34, .045),
			i(2.15, -.11, .045),
			i(2.48, .32, .03)
		], t, "eagle-coverts");
		for (let n = 0; n < 16; n++) {
			let r = n / 15, a = .36 + r * 1.98;
			e.feather(i(a, .43 + .12 * Math.sin(r * Math.PI), .065), i(a - .08, -.29 + .2 * r, .063), .083, t, "wing", "eagle-coverts");
		}
	}
	e.ellipsoid(i(0, .015, 0), i(.29, .67, .235), "eagle-body", "body"), e.ellipsoid(i(0, .06, .14), i(.26, .59, .12), "eagle-coverts", "body"), e.ellipsoid(i(0, .56, .025), i(.155, .29, .16), "eagle-body", "head"), e.ellipsoid(i(0, .82, .06), i(.158, .19, .155), "eagle-body", "head"), e.ellipsoid(i(0, .69, .13), i(.148, .18, .103), "eagle-nape", "head"), e.ellipsoid(i(0, .977, .035), i(.078, .085, .065), "cere", "head", 7, 12), e.ellipsoid(i(0, 1.035, .005), i(.074, .083, .066), "beak", "head", 7, 12), e.ellipsoid(i(0, 1.08, -.045), i(.042, .04, .074), "beak", "head", 6, 10);
	for (let t of [-1, 1]) e.ellipsoid(i(t * .146, .865, .071), i(.025, .026, .023), "eye", "head", 5, 8);
	for (let t of e.mesh.vertices) t.region === "head" && (t.point.y = .53 + (t.point.y - .53) * .8);
	return e.mesh;
}
function D(i, a = "soar", o = 7) {
	let s = Math.max(0, i), c = o % 101 * .031, l = (s * .82 + .12) % 1, u = (s + 6) % 29 - 18, d = r(0, 1.2, u) * (1 - r(4.8, 6, u)), f = a === "flap" ? 1 : a === "glide" ? 0 : d, p = n(.65, -.63, l < .48 ? r(0, .48, l) : 1 - r(.48, 1, l)), m = Math.sin(e * l - .45), h = .0378 * Math.cos(s * .09 + c) + .0138 * Math.cos(s * .23), g = t(-h * 6.5, -.42, .42);
	return {
		time: s,
		activity: f,
		curvature: h,
		yaw: -.16 + .42 * Math.sin(s * .09 + c) + .06 * Math.sin(s * .23),
		bank: g,
		pitch: .025 + .014 * Math.sin(s * .23) + f * .018 * Math.sin(e * l - .4),
		lift: .11 + .014 * Math.sin(s * .45) + f * (p - .11),
		elbow: f * .11 * m,
		tip: -.035 + f * .19 * Math.sin(e * l - 1.05),
		fold: f * .16 * r(-.1, .85, m),
		tailSpread: .88 + .1 * Math.sin(s * .33) + Math.abs(g) * .48 + f * .08,
		tailYaw: -g * .22 + .022 * Math.sin(s * .64),
		tailPitch: .025 + .025 * Math.sin(s * .4) - f * .035 * p,
		x: .11 * Math.sin(s * .09 + c),
		y: .05 * Math.sin(s * .17),
		z: .025 * Math.sin(s * .29)
	};
}
var O = (e, t, n, r = !1) => w(e, t, T, n, r), k = {
	shoulder: i(.21, .25, .035),
	elbow: i(.84, .4, .035),
	wrist: i(1.47, .29, .035),
	elbowSweep: .78,
	wristSweep: 1.25,
	headAnchor: .42,
	tailAnchor: -.43,
	headStabilization: .72
};
function A() {
	let e = new S();
	for (let t of [-1, 1]) {
		for (let n = 5; n >= 0; n--) {
			let r = n / 5;
			e.feather(i(.012 + r * .06, -.4, .005), i(.025 + r * .27, -1.29 + .11 * r * r, .015), .067, t, "tail", "falcon-flight");
		}
		for (let r = 0; r < 12; r++) {
			let a = r / 11, o = n(.27, 1.48, a);
			e.feather(i(o + .04, .32 + .12 * Math.sin(a * Math.PI), .005), i(o - .12, -.22 - .18 * Math.sin(a * Math.PI), -.014), .078, t, "wing", "falcon-flight");
		}
		let r = [
			i(1.37, -.44, 0),
			i(1.53, -.52, 0),
			i(1.7, -.58, 0),
			i(1.88, -.63, 0),
			i(2.07, -.64, 0),
			i(2.25, -.62, 0),
			i(2.41, -.57, 0),
			i(2.54, -.51, 0),
			i(2.63, -.43, 0),
			i(2.69, -.35, 0)
		];
		for (let n = 0; n < r.length; n++) {
			let a = n / 9;
			e.feather(i(1.3 + a * .3, .33 - a * .09, .012), r[n], .088 - a * .034, t, "wing", "falcon-flight", -.015);
		}
		e.panel([
			i(.18, .35, .048),
			i(.66, .49, .048),
			i(1.17, .49, .05),
			i(1.56, .31, .045),
			i(2.03, -.01, .035),
			i(2.69, -.35, .012)
		], [
			i(.22, -.12, .04),
			i(.66, -.15, .04),
			i(1.17, -.14, .04),
			i(1.56, -.2, .035),
			i(2.03, -.31, .025),
			i(2.69, -.35, .012)
		], t, "falcon-back");
		for (let n = 0; n < 11; n++) {
			let r = n / 10, a = .32 + r * 1.25;
			e.feather(i(a, .36 + .06 * Math.sin(r * Math.PI), .06), i(a - .06, -.12 + .05 * r, .06), .074, t, "wing", "falcon-back");
		}
	}
	e.ellipsoid(i(0, .06, 0), i(.238, .56, .205), "falcon-breast", "body"), e.ellipsoid(i(0, .015, .13), i(.225, .51, .1), "falcon-back", "body"), e.ellipsoid(i(0, .51, .025), i(.15, .22, .145), "falcon-head", "head"), e.ellipsoid(i(0, .69, .035), i(.173, .18, .158), "falcon-head", "head"), e.ellipsoid(i(0, .683, .12), i(.176, .18, .095), "falcon-hood", "head");
	for (let t of [-1, 1]) e.ellipsoid(i(t * .155, .65, -.027), i(.025, .076, .098), "falcon-hood", "head", 8, 12), e.ellipsoid(i(t * .159, .735, .043), i(.027, .029, .028), "cere", "head", 6, 10), e.ellipsoid(i(t * .177, .738, .045), i(.017, .019, .019), "eye", "head", 5, 8);
	e.ellipsoid(i(0, .846, .018), i(.058, .048, .052), "cere", "head", 7, 12), e.ellipsoid(i(0, .89, -.007), i(.054, .058, .049), "beak", "head", 7, 12), e.ellipsoid(i(0, .923, -.044), i(.03, .025, .045), "beak", "head", 6, 10);
	for (let t of e.mesh.vertices) t.region === "head" && (t.point.y = .42 + (t.point.y - .42) * .76);
	return e.mesh;
}
function j(i, a = "soar", o = 7) {
	let s = Math.max(0, i), c = o % 101 * .027, l = (s * 2.1 + .21) % 1, u = s % 12, d = r(4.5, 5.3, u) * (1 - r(7.7, 8.5, u)), f = a === "flap" ? 1 : a === "glide" ? 0 : 1 - d, p = n(.72, -.61, l < .37 ? r(0, .37, l) : 1 - r(.37, 1, l)), m = Math.sin(e * l - .4), h = .044 * Math.cos(s * .22 + c) + .0399 * Math.cos(s * .57), g = t(-h * 5, -.48, .48);
	return {
		time: s,
		activity: f,
		curvature: h,
		yaw: -.2 + .2 * Math.sin(s * .22 + c) + .07 * Math.sin(s * .57),
		bank: g,
		pitch: -.035 + .013 * Math.sin(s * .48) + f * .012 * Math.sin(e * l - .6),
		lift: -.025 + f * (p + .025),
		elbow: f * .14 * m,
		tip: f * .25 * Math.sin(e * l - 1),
		fold: (1 - f) * .19 + f * (.07 + .24 * r(-.2, .8, m)),
		tailSpread: .72 + Math.abs(g) * .52 + .045 * Math.sin(s * .94),
		tailYaw: -g * .31 + .022 * Math.sin(s * 1.35),
		tailPitch: .012 + .021 * Math.sin(s * .73) - f * .022 * p,
		x: .1 * Math.sin(s * .22 + c),
		y: .045 * Math.sin(s * .39),
		z: .022 * Math.sin(s * .59)
	};
}
// src/species.ts
var M = [
	{
		id: "swallow-tailed-kite",
		name: "Gavião-tesoura",
		scientificName: "Elanoides forficatus",
		englishName: "Swallow-tailed kite",
		number: "01",
		description: "Asas longas e pontudas, cabeça e ventre claros e cauda preta profundamente bifurcada.",
		story: "Asas estreitas, penas sobrepostas e uma cauda que desenha uma tesoura no ar. A identidade deste gavião está na relação entre essas formas — e na maneira como elas se movem juntas.",
		reference: "https://www.allaboutbirds.org/guide/Swallow-tailed_Kite/id",
		create: _,
		transform: v,
		flight: y,
		framing: {
			width: 6.5,
			height: 5.1,
			profileHeight: 6.3
		},
		studies: [
			{
				name: "Planar",
				detail: "VENTRAL",
				view: "ventral",
				pose: {
					yaw: -.28,
					bank: 0,
					lift: 0,
					tip: 0,
					elbow: 0,
					fold: 0
				}
			},
			{
				name: "Inclinar",
				detail: "35°",
				view: "oblique",
				pose: {
					yaw: .24,
					bank: .61,
					lift: .015,
					tip: 0,
					elbow: 0,
					fold: 0
				}
			},
			{
				name: "Recuperar",
				detail: "ASAS ALTAS",
				view: "oblique",
				pose: {
					yaw: -.25,
					bank: .02,
					lift: .68,
					tip: -.17,
					elbow: -.09,
					fold: .15
				}
			},
			{
				name: "Impulsionar",
				detail: "ASAS BAIXAS",
				view: "oblique",
				pose: {
					yaw: .12,
					bank: 0,
					lift: -.64,
					tip: .2,
					elbow: .08,
					fold: 0
				}
			}
		]
	},
	{
		id: "golden-eagle",
		name: "Águia-real",
		scientificName: "Aquila chrysaetos",
		englishName: "Golden eagle",
		number: "02",
		description: "Águia adulta de asas largas, primárias separadas, nuca dourada e cauda longa em leque.",
		story: "Primárias abertas como dedos, asas largas e uma nuca dourada. A águia-real sustenta um leve V no planeio, inclina o corpo em curvas amplas e abre a cauda em leque. Suas batidas têm outra amplitude e outro peso.",
		reference: "https://www.allaboutbirds.org/guide/Golden_Eagle/id",
		create: E,
		transform: O,
		flight: D,
		framing: {
			width: 7.8,
			height: 6,
			profileHeight: 6.6
		},
		studies: [
			{
				name: "Sustentar",
				detail: "DIÉDRICO",
				view: "ventral",
				pose: {
					yaw: -.2,
					bank: 0,
					lift: .11,
					tip: -.035,
					elbow: 0,
					fold: 0
				}
			},
			{
				name: "Circular",
				detail: "32°",
				view: "oblique",
				pose: {
					yaw: .16,
					bank: .56,
					lift: .12,
					tip: -.035,
					elbow: 0,
					fold: .03
				}
			},
			{
				name: "Recuperar",
				detail: "PRIMÁRIAS ABERTAS",
				view: "oblique",
				pose: {
					yaw: -.2,
					bank: .02,
					lift: .65,
					tip: -.16,
					elbow: -.08,
					fold: .13
				}
			},
			{
				name: "Impulsionar",
				detail: "BATIDA AMPLA",
				view: "oblique",
				pose: {
					yaw: .1,
					bank: 0,
					lift: -.61,
					tip: .17,
					elbow: .07,
					fold: 0
				}
			}
		]
	},
	{
		id: "peregrine-falcon",
		name: "Falcão-peregrino",
		scientificName: "Falco peregrinus",
		englishName: "Peregrine falcon",
		number: "03",
		description: "Falcão adulto de asas afiladas e recolhíveis, corpo compacto, capuz escuro, bigode e ventre barrado.",
		story: "Um corpo compacto entre asas afiladas. O capuz e o bigode escuros encontram o peito claro e barrado. O peregrino alterna voo batido com deslizes mais contidos, recolhendo os punhos e mantendo a cauda estreita.",
		reference: "https://www.allaboutbirds.org/guide/Peregrine_Falcon/id",
		create: A,
		transform: (e, t, n, r = !1) => w(e, t, k, n, r),
		flight: j,
		framing: {
			width: 6,
			height: 4.7,
			profileHeight: 5.3
		},
		studies: [
			{
				name: "Deslizar",
				detail: "ASAS AFILADAS",
				view: "ventral",
				pose: {
					yaw: -.22,
					bank: 0,
					lift: -.025,
					tip: 0,
					elbow: 0,
					fold: .19
				}
			},
			{
				name: "Virar",
				detail: "35°",
				view: "oblique",
				pose: {
					yaw: .1,
					bank: .61,
					lift: .02,
					tip: 0,
					elbow: 0,
					fold: .16
				}
			},
			{
				name: "Recuperar",
				detail: "PUNHOS FLEXIONADOS",
				view: "oblique",
				pose: {
					yaw: -.2,
					bank: 0,
					lift: .72,
					tip: -.16,
					elbow: -.1,
					fold: .3
				}
			},
			{
				name: "Compactar",
				detail: "ASAS RECOLHIDAS",
				view: "oblique",
				pose: {
					yaw: -.15,
					bank: .08,
					lift: .03,
					tip: .05,
					elbow: .08,
					fold: .62,
					tailSpread: .65
				}
			}
		]
	}
];
function N(e) {
	let t = M.find((t) => t.id === e);
	if (!t) throw RangeError(`Invalid species: ${e}`);
	return t;
}
// src/ascii.ts
var P = ".,:;!ilt+/=xos%S8&#@-|\\", F = 24, I = s(i(-.6, .5, -.8));
function L(e) {
	let t = {
		oblique: -58,
		ventral: -89,
		dorsal: 74,
		profile: -10
	}[e] * Math.PI / 180, n = e === "profile" ? Math.PI * .4 : 0, r = i(Math.sin(n) * Math.cos(t), -Math.cos(n) * Math.cos(t), Math.sin(t)), a = i(Math.cos(n), Math.sin(n), 0), s = o(r, a);
	return s.y < 0 && (a = i(-a.x, -a.y, -a.z), s = i(-s.x, -s.y, -s.z)), {
		right: a,
		up: s,
		toward: r
	};
}
function R(e, t = "swallow-tailed-kite") {
	let n = N(t).framing;
	return {
		width: n.width,
		height: e === "profile" ? n.profileHeight : n.height,
		centerY: .5
	};
}
var z = class {
	canvas;
	ctx;
	atlas;
	atlasCtx;
	presentationAtlas;
	width = 0;
	height = 0;
	dpr = 1;
	cw = 7;
	ch = 11;
	cols = 0;
	rows = 0;
	sw = 0;
	sh = 0;
	depth = /* @__PURE__ */ new Float32Array();
	shade = /* @__PURE__ */ new Float32Array();
	keys = /* @__PURE__ */ new Uint32Array();
	ids = /* @__PURE__ */ new Uint16Array();
	tints = /* @__PURE__ */ new Uint8Array();
	previousKey = /* @__PURE__ */ new Uint32Array();
	previousLevel = /* @__PURE__ */ new Uint8Array();
	projected = /* @__PURE__ */ new Float32Array();
	densityOrder = [];
	settings;
	atlasW = 0;
	atlasH = 0;
	stats = {
		cells: 0,
		triangles: 0,
		columns: 0,
		rows: 0
	};
	constructor(e, t) {
		this.canvas = e;
		let n = e.getContext("2d", { alpha: !1 });
		if (!n) throw Error("Canvas 2D is unavailable.");
		this.ctx = n, this.atlas = e.ownerDocument.createElement("canvas"), this.atlasCtx = this.atlas.getContext("2d", { willReadFrequently: !0 }), this.settings = t;
	}
	configure(e) {
		this.settings.species !== e.species && (this.atlas = this.canvas.ownerDocument.createElement("canvas"), this.atlasCtx = this.atlas.getContext("2d", { willReadFrequently: !0 }));
		let t = this.settings.theme !== e.theme || this.settings.detail !== e.detail || this.settings.species !== e.species;
		this.settings = e, t && this.width && this.resize(this.width, this.height, this.dpr);
	}
	resize(e, n, r = 1) {
		this.width = e, this.height = n, this.dpr = t(r, 1, 2);
		let i = {
			fine: .77,
			balanced: 1,
			coarse: 1.42
		}[this.settings.detail];
		this.cw = t(e / 170, 5.2, 8.6) * i, this.ch = this.cw * 1.55, this.cols = Math.ceil(e / this.cw), this.rows = Math.ceil(n / this.ch), this.sw = this.cols * 2, this.sh = this.rows * 2;
		let a = this.sw * this.sh;
		this.depth = new Float32Array(a), this.shade = new Float32Array(a), this.keys = new Uint32Array(a), this.ids = new Uint16Array(a), this.tints = new Uint8Array(a), this.previousKey = new Uint32Array(this.cols * this.rows), this.previousLevel = new Uint8Array(this.cols * this.rows), this.canvas.width = Math.round(e * this.dpr), this.canvas.height = Math.round(n * this.dpr), this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0), this.ctx.imageSmoothingEnabled = !0, this.buildAtlas();
	}
	buildAtlas() {
		this.atlasW = Math.ceil(this.cw * this.dpr), this.atlasH = Math.ceil(this.ch * this.dpr), this.atlas.width = this.atlasW * 23;
		let e = !this.settings.species || this.settings.species === "swallow-tailed-kite" ? 1 : 3;
		this.atlas.height = this.atlasH * F * e;
		let t = this.atlasCtx;
		t.clearRect(0, 0, this.atlas.width, this.atlas.height), t.font = `600 ${this.ch * this.dpr * .9}px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`, t.textAlign = "center", t.textBaseline = "middle", t.fillStyle = "#fff";
		for (let e = 0; e < 23; e++) t.fillText(P[e], (e + .5) * this.atlasW, this.atlasH * .51);
		let n = t.getImageData(0, 0, this.atlas.width, this.atlasH).data, r = Array.from(P, (e, t) => {
			let r = 0;
			for (let e = 0; e < this.atlasH; e++) for (let i = t * this.atlasW; i < (t + 1) * this.atlasW; i++) r += n[(e * this.atlas.width + i) * 4 + 3];
			return {
				g: t,
				ink: r
			};
		}).sort((e, t) => e.ink - t.ink);
		this.densityOrder = r.map((e) => e.g), t.clearRect(0, 0, this.atlas.width, this.atlas.height);
		for (let n = 0; n < e; n++) for (let e = 0; e < F; e++) {
			let r = e / 23, i = this.settings.theme === "dark" ? Math.round(90 + r * 163) : Math.round(172 - r * 150), a = i, o = i + +(this.settings.theme === "dark"), s = Math.min(255, i + 3);
			n === 1 ? this.settings.species === "golden-eagle" ? (o = Math.round(i * .91), s = Math.round(i * .78)) : (a = Math.round(i * .86), o = Math.round(i * .95), s = Math.min(255, i + 7)) : n === 2 && (a = Math.min(255, Math.round(i * 1.08)), o = Math.round(i * .86), s = Math.round(i * .53)), t.fillStyle = `rgb(${a} ${o} ${s})`;
			for (let r = 0; r < 23; r++) t.fillText(P[r], (r + .5) * this.atlasW, (n * F + e + .51) * this.atlasH);
		}
		if (e > 1 && !this.ctx.getContextAttributes?.().willReadFrequently) {
			let e = this.canvas.ownerDocument.createElement("canvas");
			e.width = this.atlas.width, e.height = this.atlas.height, e.getContext("2d").drawImage(this.atlas, 0, 0), this.presentationAtlas = e;
		} else this.presentationAtlas = void 0;
	}
	materialShade(e, n, r, i, a, o) {
		let s = e === "white" || e === "lining" && !r, c = this.settings.theme === "dark", l = f(o * 7853 + Math.floor(i * 18) * 277 + Math.floor(a * 5)) % 100 / 100, u = e === "flight" && Math.abs(a - .5) < .07 ? .06 : 0;
		if (e.startsWith("eagle-")) {
			let r = {
				"eagle-body": .53,
				"eagle-coverts": .58,
				"eagle-flight": .41,
				"eagle-nape": .77
			}[e] + n * .17 + l * .055;
			return t(c ? r : 1 - r * .65, 0, 1);
		}
		if (e === "cere") return c ? .69 : .63;
		if (e.startsWith("falcon-")) {
			let o = Math.sin((e === "falcon-breast" ? a * 23 : i * 17) * Math.PI + Math.sin(a * 12) * .3) > .65, s = .48;
			e === "falcon-head" ? s = .81 : e === "falcon-breast" ? s = a > .26 && o ? .36 : .78 : e === "falcon-hood" ? s = .25 : r || (s = o ? .35 : .7);
			let u = s + n * .13 + l * .045;
			return t(c ? u : .95 - u * .7, 0, 1);
		}
		return e === "eye" || e === "beak" ? c ? .12 : .92 : t(c ? (s ? .78 : .39) + n * (s ? .18 : .2) + l * .055 + u : (s ? .33 : .78) + (1 - n) * .12 + l * .055 + u, 0, 1);
	}
	render(e, n) {
		if (!this.width) return;
		let { positions: r } = n, { right: i, up: a, toward: o } = L(this.settings.view), s = R(this.settings.view, this.settings.species), c = Math.min(this.width / s.width, this.height / s.height) * this.settings.scale, l = this.height * s.centerY;
		this.projected.length !== r.length && (this.projected = new Float32Array(r.length));
		let u = this.projected;
		for (let e = 0; e < r.length; e += 3) {
			let t = r[e], n = r[e + 1], s = r[e + 2];
			u[e] = ((t * i.x + n * i.y + s * i.z) * c + this.width * .5) / this.cw * 2, u[e + 1] = (-(t * a.x + n * a.y + s * a.z) * c + l) / this.ch * 2, u[e + 2] = t * o.x + n * o.y + s * o.z;
		}
		this.depth.fill(-Infinity), this.ids.fill(0);
		let { sw: d, sh: p, depth: m, shade: h, keys: g, ids: _ } = this, v = 0;
		for (let t of e.faces) {
			let n = e.vertices[t.a], i = e.vertices[t.b], a = e.vertices[t.c], s = t.a * 3, c = t.b * 3, l = t.c * 3, y = r[c] - r[s], b = r[c + 1] - r[s + 1], x = r[c + 2] - r[s + 2], S = r[l] - r[s], C = r[l + 1] - r[s + 1], w = r[l + 2] - r[s + 2], T = b * w - x * C, E = x * S - y * w, D = y * C - b * S, O = Math.hypot(T, E, D) || 1, k = n.side < 0 ? -1 : 1;
			T *= k / O, E *= k / O, D *= k / O;
			let A = T * o.x + E * o.y + D * o.z, j = A > 0;
			if ((n.region === "body" || n.region === "head") && A <= 0) continue;
			A < 0 && (T *= -1, E *= -1, D *= -1);
			let M = Math.max(0, T * I.x + E * I.y + D * I.z), N = u[s], P = u[s + 1], F = u[c], L = u[c + 1], R = u[l], z = u[l + 1], B = (L - z) * (N - R) + (R - F) * (P - z);
			if (Math.abs(B) < 1e-5) continue;
			let V = Math.max(0, Math.floor(Math.min(N, F, R))), H = Math.min(d - 1, Math.ceil(Math.max(N, F, R))), U = Math.max(0, Math.floor(Math.min(P, L, z))), W = Math.min(p - 1, Math.ceil(Math.max(P, L, z))), G = 1 / B, K = t.material === "lining" || n.region === "wing" && (t.material === "eagle-coverts" || t.material === "falcon-back") ? .055 : 0, q = t.material === "eagle-nape" || t.material === "cere" ? 2 : t.material.startsWith("eagle-") || t.material.startsWith("falcon-") && j && t.material !== "falcon-hood" && t.material !== "falcon-head" && t.material !== "falcon-breast" ? 1 : 0;
			v++;
			for (let e = U; e <= W; e++) for (let r = V; r <= H; r++) {
				let o = r + .5, p = e + .5, v = ((L - z) * (o - R) + (R - F) * (p - z)) * G, y = ((z - P) * (o - R) + (N - R) * (p - z)) * G, b = 1 - v - y;
				if (v < -1e-5 || y < -1e-5 || b < -1e-5) continue;
				let x = u[s + 2] * v + u[c + 2] * y + u[l + 2] * b + K, S = e * d + r;
				if (x <= m[S]) continue;
				m[S] = x;
				let C = n.u * v + i.u * y + a.u * b, w = n.v * v + i.v * y + a.v * b;
				_[S] = t.id, this.tints[S] = q, g[S] = f(t.id * 997 + Math.floor(C * 12) * 47 + Math.floor(w * 4)), h[S] = this.materialShade(t.material, M, j, C, w, t.id);
			}
		}
		let y = this.ctx;
		y.fillStyle = this.settings.theme === "dark" ? "#0b0b0c" : "#f4f1ea", y.fillRect(0, 0, this.width, this.height);
		let b = 0, x = this.settings.representation === "silhouette";
		for (let e = 0; e < this.rows; e++) for (let n = 0; n < this.cols; n++) {
			let r = e * 2 * d + n * 2, i = 0, a = 0, o = r, s = -Infinity;
			for (let e = 0; e < 4; e++) {
				let t = r + (e & 1) + (e >> 1) * d;
				_[t] && (i++, a += h[t], m[t] > s && (s = m[t], o = t));
			}
			if (!i) continue;
			let c = x ? .85 : a / i, l = g[o], u = e * this.cols + n, f = Math.round(c * 23);
			this.previousKey[u] === l && Math.abs(f - this.previousLevel[u]) <= 1 && (f = this.previousLevel[u]), this.previousKey[u] = l, this.previousLevel[u] = f;
			let p = i < 3 ? Math.min(3, i) : Math.floor(t(c * .6 + l % 997 / 997 * .4, 0, .999) * this.densityOrder.length), v = this.densityOrder[p];
			if (i < 3) {
				let t = n > 0 && _[r - 1] ? 1 : 0, i = n < this.cols - 1 && _[r + 2] ? 1 : 0, a = e > 0 && _[r - d] ? 1 : 0, o = e < this.rows - 1 && _[r + 2 * d] ? 1 : 0, s = i - t, c = o - a, l = s && c ? s === c ? "/" : "\\" : c ? "-" : "|";
				v = P.indexOf(l), f = Math.max(f, this.settings.theme === "dark" ? 7 : 11);
			}
			y.globalAlpha = i < 4 ? .4 + i / 4 * .6 : 1, y.drawImage(this.presentationAtlas ?? this.atlas, v * this.atlasW, (this.tints[o] * F + f) * this.atlasH, this.atlasW, this.atlasH, n * this.cw, e * this.ch, this.cw, this.ch), b++;
		}
		y.globalAlpha = 1, this.stats = {
			cells: b,
			triangles: v,
			columns: this.cols,
			rows: this.rows
		};
	}
	resetHistory() {
		this.previousKey.fill(0), this.previousLevel.fill(0);
	}
}, B = {
	species: "swallow-tailed-kite",
	theme: "dark",
	view: "oblique",
	detail: "balanced",
	scale: 1,
	mode: "soar",
	representation: "articulated",
	seed: 7,
	maxFPS: 60,
	paused: !1
}, V = class {
	canvas;
	options;
	specimen;
	mesh;
	positions;
	renderer;
	raf = 0;
	last = 0;
	lastPaint = 0;
	disposed = !1;
	inView = !0;
	time = 0;
	motionOverride = !1;
	motion;
	resizeObserver;
	intersectionObserver;
	frameTimes = /* @__PURE__ */ new Float32Array(120);
	frameCount = 0;
	p95 = 0;
	cost = 0;
	override;
	transition;
	constructor(e, t = {}) {
		this.canvas = e, this.options = {
			...B,
			...t
		}, this.validate(this.options), this.specimen = N(this.options.species), this.mesh = this.specimen.create(), this.positions = new Float32Array(this.mesh.vertices.length * 3), this.motion = window.matchMedia("(prefers-reduced-motion: reduce)"), this.renderer = new z(e, this.options), this.resizeObserver = new ResizeObserver(() => this.resize()), this.resizeObserver.observe(e), this.intersectionObserver = new IntersectionObserver(([e]) => {
			this.inView = e.isIntersecting, this.schedule();
		}), this.intersectionObserver.observe(e), this.motion.addEventListener("change", this.onMotion), e.ownerDocument.addEventListener("visibilitychange", this.onVisibility), this.resize(), this.schedule();
	}
	validate(e) {
		let t = {
			species: M.map((e) => e.id),
			theme: ["dark", "light"],
			view: [
				"oblique",
				"ventral",
				"dorsal",
				"profile"
			],
			detail: [
				"fine",
				"balanced",
				"coarse"
			],
			mode: [
				"soar",
				"glide",
				"flap"
			],
			representation: [
				"articulated",
				"flat",
				"silhouette"
			]
		};
		for (let n of Object.keys(t)) if (!t[n].includes(e[n])) throw RangeError(`Invalid ${n}`);
		if (!Number.isFinite(e.scale) || e.scale < .4 || e.scale > 1.8) throw RangeError("scale must be between 0.4 and 1.8");
		if (!Number.isFinite(e.maxFPS) || e.maxFPS < 1 || e.maxFPS > 120) throw RangeError("maxFPS must be between 1 and 120");
		if (!Number.isFinite(e.seed)) throw RangeError("seed must be finite");
	}
	get canRun() {
		return !this.disposed && !this.options.paused && this.inView && !this.canvas.ownerDocument.hidden && (!this.motion.matches || this.motionOverride);
	}
	get stats() {
		return {
			species: this.options.species,
			time: this.time,
			frameMs: this.cost,
			p95Ms: this.p95,
			...this.renderer.stats,
			running: this.canRun,
			reducedMotion: this.motion.matches
		};
	}
	setOptions(e) {
		if (this.disposed) return;
		let t = {
			...this.options,
			...e
		};
		this.validate(t), t.species === this.options.species ? t.mode !== this.options.mode && (this.transition = {
			from: this.currentPose(),
			start: this.time
		}) : (this.specimen = N(t.species), this.mesh = this.specimen.create(), this.positions = new Float32Array(this.mesh.vertices.length * 3), this.time = 0, this.override = void 0, this.transition = void 0, this.frameCount = 0, this.p95 = 0, this.frameTimes.fill(0)), this.options = t, this.renderer.configure(this.options), this.render(), this.schedule();
	}
	pause() {
		this.setOptions({ paused: !0 });
	}
	play() {
		this.override && (this.transition = {
			from: this.currentPose(),
			start: this.time
		}), this.motionOverride = !0, this.override = void 0, this.setOptions({ paused: !1 });
	}
	renderAt(e, t) {
		if (!Number.isFinite(e) || e < 0) throw RangeError("time must be non-negative and finite");
		if (t && Object.values(t).some((e) => !Number.isFinite(e))) throw RangeError("pose values must be finite");
		this.disposed || (this.time = e, this.override = t, this.options.paused = !0, this.transition = void 0, this.renderer.resetHistory(), this.schedule(), this.render());
	}
	resize() {
		if (this.disposed) return;
		let { width: e, height: t } = this.canvas.getBoundingClientRect();
		e < 1 || t < 1 || (this.renderer.resize(e, t, window.devicePixelRatio || 1), this.render());
	}
	render() {
		let e = performance.now(), t = this.currentPose();
		if (this.renderer.render(this.mesh, this.specimen.transform(this.mesh, t, this.positions, this.options.representation === "flat")), this.cost = performance.now() - e, this.frameTimes[this.frameCount++ % this.frameTimes.length] = this.cost, this.frameCount % 30 == 0) {
			let e = this.frameTimes.slice(0, Math.min(this.frameCount, this.frameTimes.length)).sort();
			this.p95 = e[Math.floor((e.length - 1) * .95)];
		}
	}
	currentPose() {
		let e = this.specimen.flight(this.time, this.options.mode, this.options.seed);
		if (this.transition) {
			let t = (this.time - this.transition.start) / .8;
			t >= 1 ? this.transition = void 0 : e = x(this.transition.from, e, t);
		}
		return {
			...e,
			...this.override
		};
	}
	frame = (e) => {
		this.canRun && ((!this.lastPaint || e - this.lastPaint >= 1e3 / this.options.maxFPS - .5) && (this.time += Math.max(0, e - this.last) / 1e3, this.last = e, this.lastPaint = e, this.render()), this.raf = requestAnimationFrame(this.frame));
	};
	schedule() {
		cancelAnimationFrame(this.raf), this.raf = 0, this.canRun && (this.last = performance.now(), this.lastPaint = 0, this.raf = requestAnimationFrame(this.frame));
	}
	onMotion = () => {
		this.motionOverride = !1, this.schedule(), this.render();
	};
	onVisibility = () => this.schedule();
	destroy() {
		this.disposed || (this.disposed = !0, cancelAnimationFrame(this.raf), this.resizeObserver.disconnect(), this.intersectionObserver.disconnect(), this.motion.removeEventListener("change", this.onMotion), this.canvas.ownerDocument.removeEventListener("visibilitychange", this.onVisibility));
	}
};
export { V as AsciiRaptor, M as SPECIES, y as flightPose, N as getSpecies, b as poseAtAngle };
