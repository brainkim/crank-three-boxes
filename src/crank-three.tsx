/** @jsx createElement */
import {
	Context,
	createElement,
	Element,
	Raw,
	Renderer as CrankRenderer,
} from "@bikeshaving/crank";
import * as THREE from "three";

type THREENode = THREE.Object3D | THREE.BufferGeometry | THREE.Material;
export class CrankThreeRenderer extends CrankRenderer<
	THREENode,
	unknown,
	THREE.Scene
> {
	_links: Record<string, THREENode> = {};
	_renderer: THREE.Renderer;
	_camera: THREE.Camera;
	constructor(renderer: THREE.Renderer, camera: THREE.Camera) {
		super();
		this._renderer = renderer;
		this._camera = camera;
	}

	// TODO: more robust linking system
	link(href: string): THREENode | undefined {
		// TODO: is there an API I can use for this
		// mimics the convention from svg url(#path);
		const match = href.match(/url\(#(.*)\)/);
		if (match == null || match[1] == null) {
			return;
		}

		return this._links[match[1]];
	}

	create(el: Element): THREENode {
		switch (el.tag) {
			case "mesh":
				return new THREE.Mesh();
			case "box":
				return new THREE.BoxBufferGeometry(el.props.width, el.props.height, el.props.depth);
			case "normal":
				return new THREE.MeshNormalMaterial();
			default:
				throw new Error(`Unknown tag: ${el.tag.toString()}`);
		}
	}

	patch(el: Element, node: THREENode): void {
		switch (el.tag) {
			case "mesh":
				const mesh = node as THREE.Mesh;
				let {geometry, material} = el.props;
				if (typeof geometry === "string") {
					geometry = this.link(geometry);
				}

				if (typeof material === "string") {
					material = this.link(material);
				}

				mesh.geometry = geometry;
				mesh.material = material;
				break;
			case "box":
				// TODO: figure out how to patch geometries
				if (typeof el.props.id === "string") {
					this._links[el.props.id] = node;
				}
				break;
			case "normal":
				if (typeof el.props.id === "string") {
					this._links[el.props.id] = node;
				}
				break;
			default:
				throw new Error(`Unknown tag: ${el.tag.toString()}`);
		}
	}

	arrange(
		_el: Element,
		parent: THREENode,
		children: Array<THREENode | string>
	): void {
		if (!(parent instanceof THREE.Object3D)) {
			return;
		}

		const oldSet: Set<THREE.Object3D> | undefined = (parent as any).__cranky;
		const newSet = new Set<THREE.Object3D>();
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child instanceof THREE.Object3D) {
				if (oldSet === undefined || !oldSet.has(child)) {
					parent.add(child);
				} else if (oldSet !== undefined) {
					oldSet.delete(child);
				}

				newSet.add(child);
			}
		}

		if (oldSet && oldSet.size) {
			for (const child of oldSet) {
				parent.remove(child);
			}
		}

		if (newSet.size) {
			(parent as any).__cranky = newSet;
		} else if (typeof (parent as any).__cranky !== "undefined") {
			(parent as any).__cranky = undefined;
		}
	}

	dispose(el: Element, node: THREENode): void {
		switch (el.tag) {
			case "mesh":
				break;
			case "box":
				const box = node as THREE.BoxBufferGeometry;
				box.dispose();
				break;
			case "normal":
				const normal = node as THREE.MeshNormalMaterial;
				normal.dispose();
				break;
		}
	}

	complete(scene: THREE.Scene): void {
		this._renderer.render(scene, this._camera);
	}
}

export function* Canvas(this: Context) {
	// TODO: stop hard coding this stuff
	const threeRenderer = new THREE.WebGLRenderer({antialias: true});
	threeRenderer.setClearColor(0xffffff);
	const camera = new THREE.PerspectiveCamera(
		50,
		window.innerWidth / window.innerHeight,
		1,
		1000,
	);
	camera.position.z = 4;
	const onresize = () => {
		threeRenderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	};
	onresize();
	window.addEventListener("resize", onresize);
	const crankRenderer = new CrankThreeRenderer(threeRenderer, camera);
	const scene = new THREE.Scene();
	for (const {children} of this) {
		crankRenderer.render(children, scene, this);
		yield <Raw value={threeRenderer.domElement} />;
	}
}
