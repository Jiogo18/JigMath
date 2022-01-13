
function fillFrameWithFormule(systeme, t) {
	var frame = generateFrame();
	systeme.setVariable('t', t);
	for (let z = 0; z < 8; z++) {
		systeme.setVariable('z', z);
		for (let y = 0; y < 8; y++) {
			systeme.setVariable('y', y);
			for (let x = 0; x < 8; x++) {
				systeme.setVariable('x', x);

				var color = systeme.getValue();
				if (isNaN(color) || typeof color !== 'number') {
					console.log('Equation non valide', { x, y, z, t, color, systeme });
					throw new Error(`L'équation n'est pas valide : ${color}`);
				}
				frame[x][y][z] = color;
			}
		}
	}
	return frame;
}

function generateFramesWithFormule() {
	const tMax = 1;

	/** @type {number[][][][]} */
	var frames = new Array(tMax);

	const formule = this.getFormule();

	var startEqua = Date.now();
	const systeme = JigMath.getSystem(formule);
	var dureeEqua = Date.now() - startEqua;
	console.log(`Système généré en ${dureeEqua} ms`, systeme);

	const start = Date.now();
	var deltaLog = 0;
	for (let t = 0; t < tMax; t++) {
		frames[t] = fillFrameWithFormule(systeme, t);
		if (Date.now() - deltaLog > 500) {
			console.info(`Génération de la frame ${t}/${tMax}`);
			deltaLog = Date.now();
		}
	}
	console.info(`Frames générées en ${Date.now() - start} ms`);
	return frames;
}

class EquaColor {
	container;
	input;
	backdrop;

	/**
	 * Create an equation area from a container
	 * Events are sent by the container
	 * @param {HTMLElement} container
	 */
	constructor(container) {
		this.container = container;
		this.input = document.createElement('textarea');
		this.input.setAttribute('spellcheck', false);
		this.input.classList.add('formule_input');
		this.backdrop = document.createElement('div');
		this.backdrop.classList.add('formule_backdrop');
		container.appendChild(this.input);
		container.appendChild(this.backdrop);
		container.classList.add('formule_container');

		// Colored TextArea https://stackoverflow.com/a/56087599/12908345
		this.input.addEventListener("scroll", () => this.backdrop.scrollTop = this.input.scrollTop);
		this.input.addEventListener("input", () => this.onFormuleChanged());
		this.input.addEventListener("mousedown", () => setTimeout(() => this.onFormuleCursorMoved(), 1));
		this.input.addEventListener("keydown", () => setTimeout(() => this.onFormuleCursorMoved(), 1));
		this.input.addEventListener('focusout', () => this.highlightBlob(null));
	}

	setFormule(formule) {
		this.input.value = formule;
		this.onFormuleChanged();
	}

	formulePrefix = '';
	getFormule() {
		/**
		 * @type {string}
		 */
		var formule = this.input.value;
		this.formulePrefix = formule.match(/^f\([\w,]+\)\s*=\s*/)?.[0] || '';
		if (this.formulePrefix)
			formule = formule.replace(this.formulePrefix, '');
		return formule;
	}

	getSystem() {
		const formule = this.getFormule();

		var debutSysteme = Date.now();
		const systeme = JigMath.getSystem(formule);
		var dureeSysteme = Date.now() - debutSysteme;
		console.log(`Système généré en ${dureeSysteme} ms`, systeme);

		return systeme;
	}

	onFormuleChanged() {
		const formule = this.getFormule();
		var system;
		var error;
		this.backdrop.innerHTML = '';

		try {
			system = new JigMath.System(formule);
			this.formuleReady = true;
		}
		catch (err) {
			this.formuleReady = false;
			if (err.constructor === JigMath.EquaError) {
				system = err.system;
				error = err;
			}
			else {
				console.warn('Formule error', err, err.system);
				this.backdrop.appendChild(this.createSpanForItem(err.message || err));
				this.sendEvent("jigmath_error", err);
				return;
			}
		}

		if (this.formulePrefix) {
			const spanPrefix = this.createSpanForItem(this.formulePrefix);
			spanPrefix.removeAttribute('JigMath');
			this.backdrop.appendChild(spanPrefix);
		}
		this.backdrop.appendChild(this.createSpanForItem(system));
		if (formule.endsWith('\n')) this.backdrop.appendChild(this.createSpanForItem(' '));
		if (error?.item) {
			var errorItem;
			if (error.data?.blobEnd) {
				const blobEndIndex = error.data.blobEnd.iS;
				const childs = Array.from(error.item?.span?.children || []);
				errorItem = childs[blobEndIndex];
			}
			if (!errorItem) {
				errorItem = error.item?.span;
			}
			errorItem?.classList.add('equa_error');
		}

		this.onFormuleCursorMoved();
		system.variables.forEach(v => v.value = 0);
		const valueAt0 = system.getValue();
		if (typeof valueAt0 !== 'number') this.formuleReady = false;
		if (this.formuleReady) {
			this.sendEvent("jigmath_ready", system);
		}
	}


	onFormuleCursorMoved() {
		const cursorIndexStart = this.input.selectionStart;
		const cursorIndexEnd = this.input.selectionEnd;

		if (cursorIndexStart !== cursorIndexEnd) {
			this.highlightBlob(null);
			return;
		}

		const cursorIndex = cursorIndexStart;
		const selectedItemBefore = this.getEquaItemAtOriginalIndex(this.backdrop, cursorIndex - 1);
		const selectedItemAfter = this.getEquaItemAtOriginalIndex(this.backdrop, cursorIndex);

		var blobHightlight;
		if (selectedItemBefore) {
			blobHightlight = this.getFirstBlobParent(selectedItemBefore);
		}
		if (selectedItemAfter && (!blobHightlight || selectedItemAfter.getAttribute('JigMath') === 'EquaBlobLimit')) {
			blobHightlight = this.getFirstBlobParent(selectedItemAfter);
		}

		this.highlightBlob(blobHightlight);
	}

	/**
	 * @param {Item} item
	 */
	createSpanForItem(item) {
		const span = document.createElement('span');
		if (typeof item === 'string') {
			this.fillSpanWithText(span, item);
			if (item.match(/^\s*$/)) {
				span.setAttribute('JigMath', 'spaces');
			}
			else {
				span.setAttribute('JigMath', 'string');
			}
			if (item === ')' || item === '(') {
				span.classList.add('equa_error');
			}
		}
		else {
			item.span = span;
			span.item = item;
			span.setAttribute('JigMath', item.constructor.name);
			const subItems = item.getSubItems();
			if (subItems) {
				for (const subItem of subItems) {
					span.appendChild(this.createSpanForItem(subItem));
				}
			}
			else {
				this.fillSpanWithText(span, item.getOriginal());
			}
			this.applyEquaDecoration(item, span);
		}
		return span;
	}

	fillSpanWithText(span, text) {
		if (text.includes('\n')) {
			var spanCount = 0;
			for (const s of text.split('\n')) {
				if (spanCount) span.appendChild(document.createElement('br'));
				const subSpan = document.createElement('span');
				subSpan.innerText = s;
				span.appendChild(subSpan);
				spanCount++;
			}
		}
		else {
			span.innerText = text;
		}
	}

	/**
	 * Colors the equation
	 * @param {Item} item
	 * @param {HTMLSpanElement} span
	 */
	applyEquaDecoration(item, span) {
		if (item.constructor === JigMath.EquaVariable) {
			if (!['x', 'y', 'z', 't'].includes(item.name)) {
				span.classList.add('equa_warning');
				this.formuleReady = false;
			}
		}
		else if (item.constructor === JigMath.EquaFunction) {
			if (!item.function) {
				span.classList.add('equa_warning');
				this.formuleReady = false;
			}
		}
	}


	/**
	 * @param {HTMLSpanElement} span
	 * @param {number} index
	 * @param {number} originalOffset
	 * @return {HTMLElement}
	 */
	getEquaItemAtOriginalIndex(span, index, originalOffset = 0) {
		/**
		 * @type {HTMLSpanElement[]}
		 */
		const subItems = span.children && Array.from(span.children);
		if (!subItems) return span;

		for (const subItem of subItems) {
			if (subItem.constructor !== HTMLSpanElement)
				continue;
			const original = subItem.innerText;
			const originalLength = original.length;
			if (originalOffset + originalLength > index)
				return this.getEquaItemAtOriginalIndex(subItem, index, originalOffset);
			originalOffset += originalLength;
		}
		return span;
	}

	/** @param {HTMLSpanElement} span */
	getFirstBlobParent(span) {
		while (span && span.getAttribute('JigMath') !== 'EquaBlob') {
			span = span.parentElement;
		}
		return span;
	}

	/** @type {HTMLSpanElement} */
	previousBlobHighlighed;
	/** @param {HTMLSpanElement} blob */
	highlightBlob(blob) {
		if (blob === this.previousBlobHighlighed) return;
		if (this.previousBlobHighlighed) {
			this.previousBlobHighlighed.removeAttribute('selected');
		}
		if (blob) {
			blob.setAttribute('selected', '');
			this.previousBlobHighlighed = blob;
		}
		else {
			this.previousBlobHighlighed = undefined;
		}
	}

	sendEvent(name, detail) {
		const myEvent = new CustomEvent(name, {
			detail,
			bubbles: true,
			cancelable: false,
			composed: false,
		});
		this.container.dispatchEvent(myEvent);
	}
}