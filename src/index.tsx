/** @jsx createElement */
import {createElement, Context, Copy, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
import {Canvas} from "./crank-three";

const ra = () => Math.random() * 360;

function* Box(this: Context) {
	const mesh = yield <mesh geometry="url(#box)" material="url(#normal)" />;
	mesh.rotation.x = ra();
	mesh.rotation.y = ra();
	mesh.rotation.z = ra();
	while (true) {
		mesh.rotation.x += 0.01;
		mesh.rotation.y += 0.01;
		yield <Copy />;
	}
}

function* Boxes(this: Context, {amount}: any) {
	let t: number | undefined;
	let fps = 60;
	const times: Array<number> = [];
	let frame: ReturnType<typeof requestAnimationFrame>;
	const animate = (t1: number) => {
		frame = requestAnimationFrame(animate);
		if (t === undefined) {
			t = t1;
			this.refresh();
			return;
		}

		times.push(t1 - t);
		t = t1;
		if (times.length >= 30) {
			const avg = times.reduce((t, t1) => t + t1) / times.length;
			fps = Math.round(1000 / avg);
			times.length = 0;
			this.dispatchEvent(new CustomEvent("fps", {
				bubbles: true,
				detail: {avg, fps},
			}));
		}

		this.refresh();
	};

	frame = requestAnimationFrame(animate);
	const boxes = Array.from({length: amount}, () => <Box />);
	try {
		for (const {amount: newAmount} of this) {
			if (amount !== newAmount) {
				if (amount < newAmount) {
					boxes.push(...Array.from({length: newAmount - amount}, () => <Box />));
				} else {
					boxes.length = newAmount;
				}

				amount = newAmount;
			}

			yield boxes;
		}
	} finally {
		cancelAnimationFrame(frame);
	}
}

function* Demo(this: Context) {
	let amount = 200;
	let fps = NaN;
	this.addEventListener("input", (ev) => {
		if ((ev.target as HTMLElement).tagName === "INPUT") {
			amount = parseInt((ev.target as HTMLInputElement).value);
		}
	});

	this.addEventListener("fps", (ev) => {
		fps = ev.detail.fps;
		this.refresh();
	});

	while (true) {
		yield (
			<Fragment>
				<Canvas>
					<box id="box" width={1} height={1} depth={1} />
					<normal id="normal" />
					<Boxes amount={amount} />
				</Canvas>
				<div style="position: absolute; top: 25px; left: 25px">
					<div>
						<a href="https://crank.js.org">Crank.js</a> Three.js Boxes Demo
					</div>
					<div>FPS: {Number.isNaN(fps) ? "N/A" : fps}</div>
				</div>
				<div style="position: absolute; top: 25px; right: 25px; text-align: right">
					<label>
						<div>Boxes: {amount}</div>
						<input type="range" min="1" max="5000" value={amount} />
					</label>
				</div>
			</Fragment>
		);
	}
}

renderer.render(<Demo />, document.getElementById("app")!);
