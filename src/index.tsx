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
	const boxes = Array.from({length: amount}, () => <Box />);
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
}

function* Demo(this: Context) {
	let frame: any;
	let amount = 200;
	let t = 0;
	// filling with an inital value so Array.prototype.reduce doesn’t throw an error
	const times = [1];

	this.addEventListener("input", (ev) => {
		if ((ev.target as HTMLElement).tagName === "INPUT") {
			amount = parseInt((ev.target as HTMLInputElement).value);
		}
	});

	try {
		while (true) {
			frame = requestAnimationFrame((t1) => {
				const d = t1 - t;
				if (times.length > 30) {
					times.shift();
				}

				times.push(d);
				t = t1;
				this.refresh();
			});
			const avgTime = times.reduce((total, t) => total + t) / times.length;
			const fps = Math.round(1000 / avgTime);
			yield (
				<Fragment>
					<Canvas>
						<boxBufferGeometry id="box" width={1} height={1} depth={1} />
						<meshNormalMaterial id="normal" />
						<Boxes amount={amount} />
					</Canvas>
					<div style="position: absolute; top: 25px; left: 25px">
						<div>
							<a href="https://crank.js.org">Crank.js</a> Three.js Boxes Demo
						</div>
						<div>FPS: {fps}</div>
					</div>
					<div style="position: absolute; top: 25px; right: 25px; text-align: right">
						<label>
							<div>Boxes: {amount}</div>
							<input type="range" min="1" max="10000" value={amount} />
						</label>
					</div>
				</Fragment>
			);
		}
	} finally {
		cancelAnimationFrame(frame);
	}
}

renderer.render(<Demo />, document.getElementById("app")!);
