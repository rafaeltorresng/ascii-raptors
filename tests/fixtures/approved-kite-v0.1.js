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
// src/ascii.ts
var p = ".,:;!ilt+/=xos%S8&#@-|\\", m = 24, h = s(i(-.6, .5, -.8));
function g(e) {
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
function _(e) {
	return {
		width: 6.5,
		height: e === "profile" ? 6.3 : 5.1,
		centerY: .5
	};
}
var v = class {
	canvas;
	ctx;
	atlas;
	atlasCtx;
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
		let t = this.settings.theme !== e.theme || this.settings.detail !== e.detail;
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
		this.depth = new Float32Array(a), this.shade = new Float32Array(a), this.keys = new Uint32Array(a), this.ids = new Uint16Array(a), this.previousKey = new Uint32Array(this.cols * this.rows), this.previousLevel = new Uint8Array(this.cols * this.rows), this.canvas.width = Math.round(e * this.dpr), this.canvas.height = Math.round(n * this.dpr), this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0), this.ctx.imageSmoothingEnabled = !0, this.buildAtlas();
	}
	buildAtlas() {
		this.atlasW = Math.ceil(this.cw * this.dpr), this.atlasH = Math.ceil(this.ch * this.dpr), this.atlas.width = this.atlasW * 23, this.atlas.height = this.atlasH * m;
		let e = this.atlasCtx;
		e.clearRect(0, 0, this.atlas.width, this.atlas.height), e.font = `600 ${this.ch * this.dpr * .9}px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`, e.textAlign = "center", e.textBaseline = "middle", e.fillStyle = "#fff";
		for (let t = 0; t < 23; t++) e.fillText(p[t], (t + .5) * this.atlasW, this.atlasH * .51);
		let t = e.getImageData(0, 0, this.atlas.width, this.atlasH).data, n = Array.from(p, (e, n) => {
			let r = 0;
			for (let e = 0; e < this.atlasH; e++) for (let i = n * this.atlasW; i < (n + 1) * this.atlasW; i++) r += t[(e * this.atlas.width + i) * 4 + 3];
			return {
				g: n,
				ink: r
			};
		}).sort((e, t) => e.ink - t.ink);
		this.densityOrder = n.map((e) => e.g), e.clearRect(0, 0, this.atlas.width, this.atlas.height);
		for (let t = 0; t < m; t++) {
			let n = t / 23, r = this.settings.theme === "dark" ? Math.round(90 + n * 163) : Math.round(172 - n * 150);
			e.fillStyle = `rgb(${r} ${r + +(this.settings.theme === "dark")} ${Math.min(255, r + 3)})`;
			for (let n = 0; n < 23; n++) e.fillText(p[n], (n + .5) * this.atlasW, (t + .51) * this.atlasH);
		}
	}
	materialShade(e, n, r, i, a, o) {
		let s = e === "white" || e === "lining" && !r, c = this.settings.theme === "dark", l = f(o * 7853 + Math.floor(i * 18) * 277 + Math.floor(a * 5)) % 100 / 100, u = e === "flight" && Math.abs(a - .5) < .07 ? .06 : 0;
		return e === "eye" || e === "beak" ? c ? .12 : .92 : t(c ? (s ? .78 : .39) + n * (s ? .18 : .2) + l * .055 + u : (s ? .33 : .78) + (1 - n) * .12 + l * .055 + u, 0, 1);
	}
	render(e, n) {
		if (!this.width) return;
		let { positions: r } = n, { right: i, up: a, toward: o } = g(this.settings.view), s = _(this.settings.view), c = Math.min(this.width / s.width, this.height / s.height) * this.settings.scale, l = this.height * s.centerY;
		this.projected.length !== r.length && (this.projected = new Float32Array(r.length));
		let u = this.projected;
		for (let e = 0; e < r.length; e += 3) {
			let t = r[e], n = r[e + 1], s = r[e + 2];
			u[e] = ((t * i.x + n * i.y + s * i.z) * c + this.width * .5) / this.cw * 2, u[e + 1] = (-(t * a.x + n * a.y + s * a.z) * c + l) / this.ch * 2, u[e + 2] = t * o.x + n * o.y + s * o.z;
		}
		this.depth.fill(-Infinity), this.ids.fill(0);
		let { sw: d, sh: m, depth: v, shade: y, keys: b, ids: x } = this, S = 0;
		for (let t of e.faces) {
			let n = e.vertices[t.a], i = e.vertices[t.b], a = e.vertices[t.c], s = t.a * 3, c = t.b * 3, l = t.c * 3, p = r[c] - r[s], g = r[c + 1] - r[s + 1], _ = r[c + 2] - r[s + 2], C = r[l] - r[s], w = r[l + 1] - r[s + 1], T = r[l + 2] - r[s + 2], E = g * T - _ * w, D = _ * C - p * T, O = p * w - g * C, k = Math.hypot(E, D, O) || 1, A = n.side < 0 ? -1 : 1;
			E *= A / k, D *= A / k, O *= A / k;
			let j = E * o.x + D * o.y + O * o.z, M = j > 0;
			if ((n.region === "body" || n.region === "head") && j <= 0) continue;
			j < 0 && (E *= -1, D *= -1, O *= -1);
			let N = Math.max(0, E * h.x + D * h.y + O * h.z), P = u[s], F = u[s + 1], I = u[c], L = u[c + 1], R = u[l], z = u[l + 1], B = (L - z) * (P - R) + (R - I) * (F - z);
			if (Math.abs(B) < 1e-5) continue;
			let V = Math.max(0, Math.floor(Math.min(P, I, R))), H = Math.min(d - 1, Math.ceil(Math.max(P, I, R))), U = Math.max(0, Math.floor(Math.min(F, L, z))), W = Math.min(m - 1, Math.ceil(Math.max(F, L, z))), G = 1 / B, K = t.material === "lining" ? .055 : 0;
			S++;
			for (let e = U; e <= W; e++) for (let r = V; r <= H; r++) {
				let o = r + .5, p = e + .5, m = ((L - z) * (o - R) + (R - I) * (p - z)) * G, h = ((z - F) * (o - R) + (P - R) * (p - z)) * G, g = 1 - m - h;
				if (m < -1e-5 || h < -1e-5 || g < -1e-5) continue;
				let _ = u[s + 2] * m + u[c + 2] * h + u[l + 2] * g + K, S = e * d + r;
				if (_ <= v[S]) continue;
				v[S] = _;
				let C = n.u * m + i.u * h + a.u * g, w = n.v * m + i.v * h + a.v * g;
				x[S] = t.id, b[S] = f(t.id * 997 + Math.floor(C * 12) * 47 + Math.floor(w * 4)), y[S] = this.materialShade(t.material, N, M, C, w, t.id);
			}
		}
		let C = this.ctx;
		C.fillStyle = this.settings.theme === "dark" ? "#0b0b0c" : "#f4f1ea", C.fillRect(0, 0, this.width, this.height);
		let w = 0, T = this.settings.representation === "silhouette";
		for (let e = 0; e < this.rows; e++) for (let n = 0; n < this.cols; n++) {
			let r = e * 2 * d + n * 2, i = 0, a = 0, o = r, s = -Infinity;
			for (let e = 0; e < 4; e++) {
				let t = r + (e & 1) + (e >> 1) * d;
				x[t] && (i++, a += y[t], v[t] > s && (s = v[t], o = t));
			}
			if (!i) continue;
			let c = T ? .85 : a / i, l = b[o], u = e * this.cols + n, f = Math.round(c * 23);
			this.previousKey[u] === l && Math.abs(f - this.previousLevel[u]) <= 1 && (f = this.previousLevel[u]), this.previousKey[u] = l, this.previousLevel[u] = f;
			let m = i < 3 ? Math.min(3, i) : Math.floor(t(c * .6 + l % 997 / 997 * .4, 0, .999) * this.densityOrder.length), h = this.densityOrder[m];
			if (i < 3) {
				let t = n > 0 && x[r - 1] ? 1 : 0, i = n < this.cols - 1 && x[r + 2] ? 1 : 0, a = e > 0 && x[r - d] ? 1 : 0, o = e < this.rows - 1 && x[r + 2 * d] ? 1 : 0, s = i - t, c = o - a, l = s && c ? s === c ? "/" : "\\" : c ? "-" : "|";
				h = p.indexOf(l), f = Math.max(f, this.settings.theme === "dark" ? 7 : 11);
			}
			C.globalAlpha = i < 4 ? .4 + i / 4 * .6 : 1, C.drawImage(this.atlas, h * this.atlasW, f * this.atlasH, this.atlasW, this.atlasH, n * this.cw, e * this.ch, this.cw, this.ch), w++;
		}
		C.globalAlpha = 1, this.stats = {
			cells: w,
			triangles: S,
			columns: this.cols,
			rows: this.rows
		};
	}
	resetHistory() {
		this.previousKey.fill(0), this.previousLevel.fill(0);
	}
}, y = i(.22, .3, .025), b = i(1.02, .39, .025), x = i(1.7, .65, .025);
function S(e, t, n) {
	let a = e, o = r(x.x - .08, x.x + .08, e.x), s = r(b.x - .08, b.x + .08, e.x);
	return a = d(a, x, -n.tip * o, -n.fold * .85 * o), a = d(a, b, -n.elbow * s, -n.fold * s), a = d(a, y, -n.lift + t * n.bank * .035), i(a.x * t, a.y, a.z);
}
function C() {
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
function w(e, t, n, r = !1) {
	let o = n ?? new Float32Array(e.vertices.length * 3);
	for (let n = 0; n < e.vertices.length; n++) {
		let s = e.vertices[n], d;
		s.region === "wing" ? d = S(s.point, s.side, t) : s.region === "tail" ? (d = i(s.point.x * s.side * t.tailSpread, s.point.y + .42, s.point.z), d = u(c(d, t.tailPitch), t.tailYaw), d.y -= .42) : s.region === "head" ? (d = c(l(a(s.point, i(0, .44, 0)), -t.bank * .65), -t.pitch * .6), d.y += .44) : d = s.point, d = u(c(l(d, r ? 0 : t.bank), t.pitch), t.yaw);
		let f = n * 3;
		o[f] = d.x + t.x, o[f + 1] = d.y + t.y, o[f + 2] = (r ? 0 : d.z) + t.z;
	}
	return {
		positions: o,
		faces: e.faces
	};
}
// src/flight.ts
function T(i, a = "soar", o = 7) {
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
function E(e, t, n = e.bank) {
	return {
		...e,
		yaw: t,
		bank: n
	};
}
function D(e, t, i) {
	let a = r(0, 1, i), o = { ...t };
	for (let r of Object.keys(t)) o[r] = n(e[r], t[r], a);
	return o;
}
// src/engine.ts
var O = {
	theme: "dark",
	view: "oblique",
	detail: "balanced",
	scale: 1,
	mode: "soar",
	representation: "articulated",
	seed: 7,
	maxFPS: 60,
	paused: !1
}, k = class {
	canvas;
	options;
	mesh = C();
	positions = new Float32Array(this.mesh.vertices.length * 3);
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
			...O,
			...t
		}, this.validate(this.options), this.motion = window.matchMedia("(prefers-reduced-motion: reduce)"), this.renderer = new v(e, this.options), this.resizeObserver = new ResizeObserver(() => this.resize()), this.resizeObserver.observe(e), this.intersectionObserver = new IntersectionObserver(([e]) => {
			this.inView = e.isIntersecting, this.schedule();
		}), this.intersectionObserver.observe(e), this.motion.addEventListener("change", this.onMotion), e.ownerDocument.addEventListener("visibilitychange", this.onVisibility), this.resize(), this.schedule();
	}
	validate(e) {
		let t = {
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
		this.validate(t), t.mode !== this.options.mode && (this.transition = {
			from: this.currentPose(),
			start: this.time
		}), this.options = t, this.renderer.configure(this.options), this.render(), this.schedule();
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
		if (this.renderer.render(this.mesh, w(this.mesh, t, this.positions, this.options.representation === "flat")), this.cost = performance.now() - e, this.frameTimes[this.frameCount++ % this.frameTimes.length] = this.cost, this.frameCount % 30 == 0) {
			let e = this.frameTimes.slice(0, Math.min(this.frameCount, this.frameTimes.length)).sort();
			this.p95 = e[Math.floor((e.length - 1) * .95)];
		}
	}
	currentPose() {
		let e = T(this.time, this.options.mode, this.options.seed);
		if (this.transition) {
			let t = (this.time - this.transition.start) / .8;
			t >= 1 ? this.transition = void 0 : e = D(this.transition.from, e, t);
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
export { k as AsciiRaptor, T as flightPose, E as poseAtAngle };
