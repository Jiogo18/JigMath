/**
MIT License

Copyright (c) 2022 Jérôme Lécuyer https://github.com/Jiogo18

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
/**
 * Math equation v2
 * by @Jiogo18
 * for @Jig0ll & @Robotek
 */

/**
 * @return {System}
 */
const JigMath = (() => {
	const minmax = (min, x, max) => Math.max(min, Math.min(x, max));
	const distance = (a, b) => Math.sqrt(a * a + b * b);
	const valideOctet = v => minmax(0, Math.round(v), 255);
	const modulo = (a, b) => a - Math.floor(a / b) * b;
	const areValidNumbers = (...list) => list.every(n => typeof n === 'number' && !isNaN(n));
	const binOp = {
		// By default bin operators transform NaN in 0, we want to keep NaN
		lsh: (a, b) => areValidNumbers(a, b) ? (a << b) : NaN,
		rsh: (a, b) => areValidNumbers(a, b) ? (a >> b) : NaN,
		and: (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a & b, 0) : NaN,
		xor: (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a ^ b, 0) : NaN,
		or: (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a | b, 0) : NaN,
	};

	class Color {
		decValue;
		get r() {
			return (this.decValue & 0xff0000) >> 16;
		}
		get g() {
			return (this.decValue & 0x00ff00) >> 8;
		}
		get b() {
			return this.decValue & 0x0000ff;
		}
		/**
		 * @param {number} value
		 */
		constructor(value) {
			this.decValue = value;
		}
		static fromRGB(r, g, b) {
			return new Color(binOp.or(binOp.lsh(valideOctet(r), 16), binOp.lsh(valideOctet(g), 8), valideOctet(b)));
		}
		hue_rotation(angle) {
			var cosA = Math.cos(angle);
			var sinA = Math.sin(angle);
			var ratio_partage = (1 / 3) * (1 - cosA);
			var sqrt1_3 = Math.sqrt(1 / 3);
			var m0 = ratio_partage + cosA;
			var m1 = ratio_partage - sqrt1_3 * sinA;
			var m2 = ratio_partage + sqrt1_3 * sinA;
			var rx = this.r * m0 + this.g * m1 + this.b * m2;
			var gx = this.r * m2 + this.g * m0 + this.b * m1;
			var bx = this.r * m1 + this.g * m2 + this.b * m0;
			return Color.fromRGB(rx, gx, bx);
		}
		lumiere(lumiere) {
			return Color.fromRGB(this.r * lumiere, this.g * lumiere, this.b * lumiere);
		}
	}

	class System {
		/**
		 * @type {Equation}
		 */
		mainEquation;

		/**
		 * @type {Equation[]}
		 */
		equations = [];

		/**
		 * @type {[{ name: label.name, value: undefined }]}
		 */
		variables = [];

		/**
		 * @param {string} equation
		 */
		constructor(equation) {
			this.mainEquation = new Equation(this, [equation]);
			this.equations.push(this.mainEquation);
			EquationParser.parseEquation(this.mainEquation);
		}

		getValue() {
			return this.mainEquation.value;
		}

		/**
		 * @return {[Item|string]}
		 */
		getSubItems() {
			return this.equations;
		}

		/**
		 * @return {[Item|string]}
		 */
		getItems() {
			return this.getSubItems().map(v => typeof v === 'string' ? [v] : v.getItems()).reduce((a, b) => [...a, ...b], []);
		}

		getLiteral() {
			return this.equations.map(e => Item.literal(e)).join('\n');
		}

		/**
		 * Simplify if possible.
		 * Return `this` if it's not.
		 * Variables are not simplified
		 */
		simplify() {
			Item.simplifyItems(this.equations);
			this.mainEquation = this.equations[0];
			return this;
		}

		/**
		 * @param {string} name
		 */
		getVariable(name) {
			return this.variables.find(v => v.name === name);
		}

		/**
		 * @param {string} name
		 * @param {number} value
		 */
		setVariable(name, value) {
			var v = this.getVariable(name);
			if (v) v.value = value;
		}

		variablesNotSet() {
			return this.variables.filter(v => typeof v.value !== 'number').map(v => v.name);
		}

		getSystem() {
			return this;
		}
	}

	class Item {
		parent;
		original;

		static regex = null;
		/**
		 * @param {Item} parent
		 * @param {string} original
		 */
		constructor(parent, original) {
			this.parent = parent;
			this.original = original;
			if (!parent) {
				console.error(`Item without parent`, this);
				throw new Error(`Item without parent`, this);
			}
			if (original === undefined) console.warn(`Item without original`, this);
		}

		/**
		 * @return {[Item|string]}
		 */
		getSubItems() {
			return;
		}

		/**
		 * @return {[Item|string]}
		 */
		getItems() {
			const subItems = this.getSubItems();
			if (!subItems) return [this];
			return subItems.map(v => typeof v === 'string' ? [v] : v.getItems()).reduce((a, b) => [...a, ...b], []);
		}

		/**
		 * @return {string}
		 */
		getOriginal() {
			return (this.originalSpaceBefore || '') + this.original + (this.originalSpaceAfter || '');
		}

		/**
		 * @return {[Item|string]}
		 */
		getBetterSubItems() {
			return this.getSubItems();
		}

		getLiteral() {
			return this.getBetterSubItems()?.map(v => Item.literal(v)).join('') || this.constructor.name;
		}

		/**
		 * @param {Item|string} item
		 * @return {string}
		 */
		static literal(item) {
			if (typeof item === 'string') return item;
			if (typeof item?.getLiteral === 'function') return item.getLiteral();
			return item?.toString();
		}

		simplify() {
			return this;
		}

		/**
		 * @param {Item[]} items
		 */
		static simplifyItems(items) {
			for (var i = 0; i < items.length; i++) {
				if (Item.prototype.isPrototypeOf(items[i]))
					items[i] = items[i].simplify();
			}
		}
		/**
		 * @param {Equation} equation
		 * @param {number} i
		 */
		static parseSentence(equation, i) {
			const sentence = equation.sentences[i];
			if (typeof sentence !== 'string') return;
			var match = sentence.match(this.regex);
			if (!match) return false;
			var splitted = equation.split({ iS: i, iC: match.index });
			if (splitted === undefined) return false;
			i += splitted;
			equation.split({ iS: i, iC: match[0].length });
			equation.replace(i, new this(equation, match[0]));
		}

		/**
		 * @return {System}
		 */
		getSystem() {
			return this.parent.getSystem();
		}
	}

	class Equation extends Item {
		/**
		 * @type {[Item|string]}
		 */
		sentences = [];

		/**
		 * @param {Item} parent
		 * @param {Item[]} sentences
		 */
		constructor(parent, sentences) {
			super(parent, sentences.map(s => s.original || s).join(''));
			this.sentences = Array.from(sentences);
		}

		get value() {
			if (this.sentences.length !== 1) {
				if (this.sentences.length < 1)
					return 0;
				else if (this.sentences.length > 1)
					return this.sentences.map(s => s.value || Item.literal(s)).join('');
				// Equation must have 1 sentence at end, but if we want '3*z' we keep it
			}
			const sentence = this.sentences[0];
			return sentence.value;
		}

		getSubItems() {
			return this.sentences;
		}

		simplify() {
			if (this.sentences.length === 0) return new EquaNumber(this.parent, 0);
			if (this.sentences.length === 1) return this.sentences[0].simplify();
			Item.simplifyItems(this.sentences);
			return this;
		}

		/**
		 * @param {number|{iS:number,iC:number}} index Char position
		 */
		getSentencePosition(index) {
			if (typeof index === 'object') return index;
			if (index < 0) return null;
			for (let iS = 0, iC = 0; iS < this.sentences.length; iS++) {
				const sentence = this.sentences[iS];
				if (typeof sentence === 'string') {
					if (index < iC) return { iS, iC: iC - iS };
					iC += sentence.length;
				} else {
					if (index == iC) return { iS, iC: 0 };
					iC++;
				}
			}
			return null;
		}

		/**
		 * @param {number} start Sentence position
		 * @param {number} end Sentence position
		 */
		getRange(start, end) {
			return this.sentences.slice(start, end);
		}

		/**
		 * @param {{iS:number,iC:number}} position Sentence & Char position
		 */
		split(position) {
			if (!position) return;
			const sentence = this.sentences[position.iS];
			if (typeof sentence !== 'string') return;							 // middle of a number
			if (position.iC <= 0 || sentence.length <= position.iC) return false; // no changes
			var sentence_1 = sentence.substring(0, position.iC);
			var sentence_2 = sentence.substring(position.iC);

			this.sentences.splice(position.iS, 1, sentence_1, sentence_2);
			return true;
		}

		/**
		 * @param {{iS:number,iC:number}} position Sentence & Char position
		 * @param {number} length Split length
		 */
		doubleSplit(position, length) {
			var itemsAdded = 0;
			if (this.split(position)) {
				// split before
				position.iS++;
				itemsAdded++;
			}
			// no split needed => iC == 0 (or spaces have been removed => iC == 0)
			position.iC = length;
			itemsAdded += this.split(position); // split after
			position.iC = 0;
			return itemsAdded;
		}

		/**
		 * @param {number} i Sentence position
		 * @param {Item} value new Sentence (inherit)
		 */
		replace(i, value, length = 1) {
			if (!Item.prototype.isPrototypeOf(value))
				throw new EquaError(`Invalid value must be an object derived from Sentence`, value, { equation: this, i, length });

			if (length == 1) {
				log(2, `Replaced`, this.sentences[i], `by`, value);
				this.sentences[i] = value;
			} else {
				log(2, `Replaced`, Array.from(this.getRange(i, i + length)), `by`, value);
				this.sentences.splice(i, length, value);
			}
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 * @return `0` if this element, `-1` if not
		 */
		matchAt(haveToMatch, index) {
			const sentence = this.sentences[index];
			if (!sentence) return -1;
			if (typeof haveToMatch === 'function')
				return haveToMatch.prototype.isPrototypeOf(sentence) ? 0 : -1;
			if (haveToMatch === null)
				return 0;

			if (typeof haveToMatch === 'string') {
				if (typeof sentence === 'string')
					return sentence.indexOf(haveToMatch);
				return (Item.literal(sentence) === haveToMatch) ? 0 : -1;

			} else if (haveToMatch?.constructor === RegExp) {
				if (typeof sentence === 'string')
					return sentence.match(haveToMatch)?.index ?? -1;
				return Item.literal(sentence).match(haveToMatch)?.index ?? -1;
			}
			console.warn(`haveToMatch must be a Class or a string`, haveToMatch);
			return -1;
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 */
		indexOf(haveToMatch, index) {
			for (let i = index; i < this.sentences.length; i++) {
				var match = this.matchAt(haveToMatch, i);
				if (match !== -1) return { iS: i, iC: match };
			}
			return null;
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 */
		lastIndexOf(haveToMatch, index) {
			for (let i = index; i >= 0; i--) {
				var match = this.matchAt(haveToMatch, i);
				if (match !== -1) {
					const sentence = this.sentences[i];
					if (typeof sentence === 'string')
						match = sentence.lastIndexOf(haveToMatch);
					return { iS: i, iC: match };
				}
			}
			return null;
		}

		/**
		 * @param {[typeof Item|string]} sentencesType
		 * @param {number} start
		 */
		match(sentencesType, start = 0) {
			if (!sentencesType?.length) return null;
			var first_sentence;
			while (first_sentence = this.indexOf(sentencesType[0], start)) {
				start = first_sentence.iS
				var iS = start;
				var doMatch = true;
				for (const haveToMatch of sentencesType) {
					if (this.matchAt(haveToMatch, iS) === -1) {
						doMatch = false;
						break;
					}
					const sentence = this.sentences[iS];
					if (typeof sentence === 'string' && typeof haveToMatch === 'string' && !sentence.match(`^\\s*\\${haveToMatch}\\s*$`)) {
						doMatch = false;
						break;
					}
					iS++;
				}
				if (doMatch) {
					return {
						result: this.getRange(start, iS),
						index: start,
						input: sentencesType,
						parent: this
					};
				}
				start++;
			}
			return null;
		}
	}

	class EquationParser {
		/**
		 * @param {Equation} equation
		 */
		static parseEquation(equation) {
			equation = EquationParser.parseIntoSentences(equation);
			equation = EquationParser.parseIntoBlobs(equation);
			equation = EquationParser.joinEquation(equation);
			if (equation.sentences.length === 0)
				return 0;
			if (equation.sentences.length === 1)
				return equation.sentences[0];
			return equation;
		}

		/**
		 * Step 1 : parse the equation into 'Sentence' specitic objects
		 * @param {Equation} equation
		 */
		static parseIntoSentences(equation) {
			var changed = false;
			const equaParse = [EquaHexaNumber, EquaBinNumber, EquaLabel, EquaNumber];
			for (let i = 0; i < equation.sentences.length;) {
				const sentence = equation.sentences[i];
				if (typeof sentence === 'string') {
					for (const EquaParseType of equaParse) {
						if (EquaParseType.parseSentence(equation, i)) {
							changed = true;
							break;
						}
					}
				}
				if (changed) {
					changed = false;
				} else {
					i++;
				}
			}

			log(3, 'Equation parsed: ', { literal: Item.literal(equation), sentences: Array.from(equation.sentences) });
			return equation;
		}

		/**
		 * Find the first closing character ) ] }
		 * @param {Equation} equation
		 * @param {number} charI EquaBlobLimit character index/id
		 */
		static blobExtractEndCharacter(equation, charI) {
			const charEnd = EquaBlob.endLimits[charI];
			var blobEnd = equation.indexOf(charEnd, 0);
			if (!blobEnd) return;
			equation.doubleSplit(blobEnd, charEnd.length);
			return blobEnd;
		}
		/**
		 * Find the last opening character until the indexEnd ( [ {
		 * @param {Equation} equation
		 * @param {number} charI
		 * @param {{iS:number, iC:number}} blobEnd EquaBlobLimit character index/id
		 */
		static blobExtractBeginCharacter(equation, charI, blobEnd) {
			const charBegin = EquaBlob.beginLimits[charI];
			var blobBegin = equation.lastIndexOf(charBegin, blobEnd.iS);
			if (!blobBegin) return;
			var deltaPos = equation.doubleSplit(blobBegin, charBegin.length);
			blobEnd.iS += deltaPos;
			return blobBegin;
		}
		/**
		 * Step 2 : group Blob
		 * extract the groups of () et [] et {}
		 * @param {Equation} equation
		 */
		static parseIntoBlobs(equation) {
			var changes;
			do {
				changes = false;

				for (const charI in EquaBlob.endLimits) {
					// Find the last character
					var blobEnd = EquationParser.blobExtractEndCharacter(equation, charI);
					if (!blobEnd) continue;

					// Find the first character
					var blobBegin = EquationParser.blobExtractBeginCharacter(equation, charI, blobEnd);
					if (!blobBegin) {
						throw new EquaError(`EquaBlobLimit Begin not found`, equation, { charI, blobBegin, blobEnd, index: blobEnd.iS });
					}

					// Find the Blob
					const match = equation.getRange(blobBegin.iS, blobEnd.iS + 1);
					if (!match?.length) {
						throw new EquaError(`EquaBlob not found`, equation, { charI, blobBegin, blobEnd, match });
					}

					const replaceBy = new EquaBlob(equation, match);
					equation.replace(blobBegin.iS, replaceBy, match.length);
					changes = true;
					break;
				}
			} while (changes);

			log(3, 'Equation blobed: ', { literal: Item.literal(equation), sentences: Array.from(equation.sentences) });
			return equation;
		}

		/**
		 * Step 3 : group Operators
		 * @param {Equation} equation
		 */
		static joinEquation(equation) {
			var match = null;
			for (const transfos of transfoCalc) {
				do {
					match = null;
					var firstTransfo = null;
					for (const transfo of transfos) {
						let transfoMatch = equation.match(transfo.match);
						if (transfoMatch && (!match || transfoMatch.index < match.index)) {
							log(3, `joinEquation found transfoCalc`, getReadableMatch(transfo.match), { transfoMatch, transfo });
							match = transfoMatch;
							firstTransfo = transfo;
						}
					}
					if (match) {
						const replaceBy = firstTransfo.joinSentences(match);
						equation.replace(match.index, replaceBy, match.result.length);
					}
				} while (match);
			}

			log(3, 'Equation joined: ', { literal: Item.literal(equation), sentences: Array.from(equation.sentences) });

			return equation;
		}
	}

	class EquaLabel extends Item {
		name;
		static regex = /[a-z_]\w*/i;
		/**
		 * @param {Item}
		 * @param {string} sentence
		 */
		constructor(parent, sentence) {
			super(parent, sentence);
			this.name = sentence.match(/\s*(.+)\s*/)[1];
		}

		get value() {
			return this.name;
		}

		getLiteral() {
			return this.name;
		}
	}

	class EquaValue extends Item {
		get value() {
			return NaN;
		}
		set value(value) {
			throw new EquaError(`EquaValue can't be changed`, this, { value });
		}
	}

	class EquaNumber extends EquaValue {
		/**
		 * @type {number}
		 */
		number;
		get value() {
			return this.number;
		}

		static regex = /\d+(?:\.\d+)?(?:E[\+\-]?\d+)?/i;
		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence, original) {
			super(parent, original || sentence);
			this.number = typeof sentence === 'number' ? sentence : parseFloat(sentence);
			if (isNaN(this.number)) throw new EquaError('NaN EquaNumber', this, { sentence });
		}

		getLiteral() {
			return this.number?.toString() || '0';
		}

	}

	class EquaHexaNumber extends EquaNumber {
		static regex = /(#|0x)[\da-f]+/i;
		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence) {
			super(parent, parseInt(sentence.replace(/^#/, '').replace(/^0x/i, ''), 16), sentence);
		}
	}

	class EquaBinNumber extends EquaNumber {
		static regex = /0b[01]+/i;
		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence) {
			super(parent, parseInt(sentence.replace(/^0b/i, ''), 2), sentence);
		}
	}

	class EquaVariable extends EquaValue {
		/**
		 * @type {{name: string, value: number}}
		 */
		globalVariable;
		get name() {
			return this.globalVariable.name;
		}
		get number() {
			return this.globalVariable.value;
		}
		get value() {
			return this.number ?? this.name;
		}

		/**
		 * @param {Item} parent
		 * @param {EquaLabel} label
		 */
		constructor(parent, label) {
			super(parent, label.getOriginal());

			const system = parent.getSystem();
			var globalVariable = system.getVariable(label.name);
			if (!globalVariable) {
				globalVariable = { name: label.name, value: undefined };
				system.variables.push(globalVariable);
			}

			this.globalVariable = globalVariable;
		}

		getLiteral() {
			return this.name;
		}
	}

	class EquaBlobLimit extends Item { }
	class EquaBlobSeparators extends Item { }

	class EquaBlob extends EquaValue {
		static beginLimits = "([{";
		static endLimits = ")]}";

		/**
		 * @type {EquaBlobLimit}
		 */
		begin;
		/**
		 * @type {Item[]}
		 */
		params;
		/**
		 * @type {EquaBlobLimit}
		 */
		end;
		originalSeparators = [];

		/**
		 * @param {Item} parent
		 * @param {[Item|string]} value
		 */
		constructor(parent, value) {
			super(parent, value.map(v => v.original || v).join(''));
			// un blob est composé de [EquaBlobLimit,EquaValue,EquaBlobSeparator,...,EquaBlobLimit]
			// => un blob est différent de EquaValue car ça permet d'avoir des opérateurs spé : 3*(1,2) = (3,6)
			// EquaFonction : [EquaLabel,EquaBlob]
			// le reste des EquaLabel => EquaVariable (permet d'avoir le simplify() autrement)

			// le joinEquation : doit faire les EquaFonction et les EquaVariables
			// le simplify a un nouvel objectif : simplifier les PairOperator quand ça peut être simplifié (*0 par ex)

			value = Array.from(value);
			this.begin = new EquaBlobLimit(this, value.shift());
			this.end = new EquaBlobLimit(this, value.pop());
			this.params = [];
			var param = [];
			const pushParam = () => {
				const equation = new Equation(this, param);
				this.params.push(equation);
				EquationParser.parseEquation(equation);
			}
			for (var sentence of value) {
				if (typeof sentence !== 'string') {
					param.push(sentence);
					continue;
				}
				var text = sentence;
				while (text.includes(',')) {
					var match = sentence.match(/(.*)(\s*,\s*)(.*)/);
					var before = match[1];
					var space = match[2];
					var after = match[3];
					if (before !== '') param.push(before);
					if (param.length === 0) param.push(new EquaNumber(this, ''));
					pushParam();
					this.originalSeparators.push(new EquaBlobSeparators(this, space));
					param = []; // add a parameter
					text = after;
				}
				if (text != '') param.push(text);
			}
			if (param.length != 0) pushParam();
		}

		get value() {
			if (this.params.length === 0) return 0;
			if (this.params.length === 1)
				return this.params[0].value;
			if (this.params.length > 1)
				return Item.literal(this);
		}

		getSubItems() {
			var subItems = [];
			if (this.originalSpaceBefore)
				subItems.push(this.originalSpaceBefore);
			subItems.push(this.begin);
			for (let i = 0; i < this.params.length; i++) {
				if (i > 0) subItems.push(this.originalSeparators[i - 1]);
				subItems.push(this.params[i]);
			}
			for (let i = Math.max(this.params.length, 1); i <= this.originalSeparators.length; i++) {
				subItems.push(this.originalSeparators[i - 1]);
			}
			subItems.push(this.end);
			if (this.originalSpaceAfter)
				subItems.push(this.originalSpaceAfter);
			return subItems;
		}

		getBetterSubItems() {
			var params = [];
			for (let i = 0; i < this.params.length; i++) {
				if (i > 0) params.push(',');
				params.push(this.params[i]);
			}
			return [this.begin, ...params, this.end];
		}

		simplify() {
			var simplified;
			if (this.params.length === 0) simplified = new EquaNumber(this.parent, 0);
			else if (this.params.length === 1) simplified = this.params[0].simplify();
			else {
				Item.simplifyItems(this.params);
				return this;
			}
			simplified.originalSpaceBefore = this.originalSpaceBefore + this.begin.getOriginal() + simplified.originalSpaceBefore
			simplified.originalSpaceAfter = simplified.originalSpaceAfter + this.end.getOriginal() + this.originalSpaceAfter;
			return simplified;
		}
	}

	class EquaFunction extends EquaValue {
		label;
		blob;
		function;

		/**
		 * @param {Item} parent
		 * @param {EquaLabel} label
		 * @param {EquaBlob} blob
		 */
		constructor(parent, label, blob) {
			super(parent, label.original + blob.original);
			this.label = label;
			var funcName = label.name.toLocaleLowerCase();
			this.blob = blob;

			if (EquaFunction.customFunctions[funcName])
				this.function = EquaFunction.customFunctions[funcName];
			else if (EquaFunction.functions[funcName])
				this.function = EquaFunction.functions[funcName];
			else if (typeof Math[funcName] === 'function')
				this.function = Math[funcName];
			else
				log(2, 'Unknow function', funcName);
		}

		static functions = {
			minmax,
			range: (min, x, max) => (min <= x && x <= max) + 0,
			pi: () => Math.PI,
			modulo,
			angle_complexe: (a, b) => modulo(Math.atan(b / a) + (a < 0 ? Math.PI : 0), 2 * Math.PI),
			triangle: (x, x0, y0, pente) => y0 - pente * Math.abs(x - x0),
			distance: (x1, y1) => distance(x1, y1),
			heaviside: t => 0 <= t,
			porte: (t, t1, t2) => t1 <= t && t <= t2,
			pente_cosale: t => (0 <= t ? t : 0),
			rgb: (r, g, b) => Color.fromRGB(r, g, b).decValue,
			red: c => (c & 0xff0000) >> 16,
			green: c => (c & 0x00ff00) >> 8,
			blue: c => c & 0x0000ff,
			huerotate: (c, angle) => new Color(c).hue_rotation(angle).decValue,
			lumiere: (c, lumiere) => new Color(c).lumiere(lumiere).decValue
		};

		static customFunctions = {};

		get value() {
			var values = this.blob.params.map(p => p.value);
			if (areValidNumbers(...values) && typeof this.function === 'function') {
				var result = this.function(...values);

				if (areValidNumbers(result))
					return result;
			}
			return this.label.name + '(' + values.join(',') + ')';
		}

		getSubItems() {
			var subItems = [];
			if (this.originalSpaceBefore)
				subItems.push(this.originalSpaceBefore);
			subItems.push(this.label, this.blob);
			if (this.originalSpaceAfter)
				subItems.push(this.originalSpaceAfter);
			return subItems;
		}

		simplify() {
			var simpBlob = this.blob.simplify();
			var simplifyByValue;
			if (simpBlob.constructor !== EquaBlob) {
				simplifyByValue = this.value; // blob without arguments
			} else if (simpBlob.params.every(p => p.constructor === EquaNumber)) {
				this.blob = simpBlob;
				simplifyByValue = this.value;
			}
			if (simplifyByValue && areValidNumbers(simplifyByValue)) {
				var simplified = new EquaNumber(this.parent, simplifyByValue);
				simplified.originalSpaceBefore = this.originalSpaceBefore + this.label.getOriginal() + simplified.originalSpaceBefore
				simplified.originalSpaceAfter = simplified.originalSpaceAfter + this.originalSpaceAfter;
				return simplified;
			}
			return this;
		}
	}

	class EquaOperator extends Item {
		value;
		constructor(parent, operator) {
			super(parent, operator);
			this.value = Item.literal(operator).match(/[^\s]+/)?.[0] || '';
		}
	}

	class PairOperator extends EquaValue {
		valueLeft;
		operator;
		valueRight;
		operation;
		/**
		 * @param {Item} parent
		 * @param {EquaValue} valueLeft
		 * @param {string} operator
		 * @param {EquaValue} valueRight
		 * @param {Function} operation
		 */
		constructor(parent, valueLeft, operator, valueRight, operation) {
			super(parent, valueLeft.getOriginal() + operator + valueRight.getOriginal());
			this.valueLeft = valueLeft;
			this.operator = new EquaOperator(this, operator);
			this.valueRight = valueRight;
			this.operation = operation;
		}

		get value() {
			const a = this.valueLeft.value;
			const b = this.valueRight.value;
			if (areValidNumbers(a, b)) {
				var result = this.operation(a, b);
				if (areValidNumbers(result))
					return result;
			}
			return '(' + this.valueLeft.value + this.operator.value + this.valueRight.value + ')';
		}

		getSubItems() {
			var subItems = [];
			if (this.originalSpaceBefore)
				subItems.push(this.originalSpaceBefore);
			subItems.push(this.valueLeft, this.operator, this.valueRight);
			if (this.originalSpaceAfter)
				subItems.push(this.originalSpaceAfter);
			return subItems;
		}
		getBetterSubItems() {
			return ['(', this.valueLeft, this.operator, this.valueRight, ')'];
		}

		simplify() {
			this.valueLeft = this.valueLeft.simplify();
			this.valueRight = this.valueRight.simplify();
			if (this.valueLeft.constructor === EquaNumber && this.valueRight.constructor === EquaNumber) {
				var simplifyByValue = this.value;
				if (simplifyByValue && areValidNumbers(simplifyByValue)) {
					var simplified = new EquaNumber(this.parent, simplifyByValue);
					simplified.originalSpaceBefore = this.originalSpaceBefore + this.label.getOriginal() + simplified.originalSpaceBefore
					simplified.originalSpaceAfter = simplified.originalSpaceAfter + this.originalSpaceAfter;
					return simplified;
				}
			}
			return this;
		}
	}

	/**
	 * @param {string} char
	 * @param {Function} operation
	 */
	function pairOperator(char, operation) {
		return {
			match: [EquaValue, char, EquaValue],
			joinSentences: (match) => {
				if (match.result.length !== 3) console.warn(`PairOperator should have only 3 matches, got ${match.result.length}`, match.result);
				return new PairOperator(match.parent, match.result[0], match.result[1], match.result[2], operation);
			}
		};
	}

	class LeftOperator extends EquaValue {
		operator;
		valueRight;
		operation;
		/**
		 * @param {Item} parent
		 * @param {string} operator
		 * @param {EquaValue} valueRight
		 * @param {Function} operation
		 */
		constructor(parent, operator, valueRight, operation) {
			super(parent, operator + valueRight.getOriginal());
			this.operator = new EquaOperator(this, operator);
			this.valueRight = valueRight;
			this.operation = operation;
		}

		get value() {
			const v = this.valueRight.value;
			if (areValidNumbers(v)) {
				var result = this.operation(v);
				if (areValidNumbers(result))
					return result;
			}
			return '(' + this.operator.value + this.valueRight.value + ')';
		}

		getBetterSubItems() {
			return ['(', this.operator, this.valueRight, ')'];
		}

		getSubItems() {
			var subItems = [];
			if (this.originalSpaceBefore)
				subItems.push(this.originalSpaceBefore);
			subItems.push(this.operator, this.valueRight);
			if (this.originalSpaceAfter)
				subItems.push(this.originalSpaceAfter);
			return subItems;
		}

		simplify() {
			this.valueRight = this.valueRight.simplify();
			if (this.valueRight.constructor === EquaNumber) {
				var simplifyByValue = this.value;
				if (simplifyByValue && areValidNumbers(simplifyByValue)) {
					var simplified = new EquaNumber(this.parent, simplifyByValue);
					simplified.originalSpaceBefore = this.originalSpaceBefore + this.label.getOriginal() + simplified.originalSpaceBefore
					simplified.originalSpaceAfter = simplified.originalSpaceAfter + this.originalSpaceAfter;
					return simplified;
				}
			}
			return this;
		}
	}

	/**
	 * @param {string} char
	 * @param {Function} operation
	 */
	function leftOperator(char, operation) {
		return {
			match: [char, EquaValue],
			joinSentences: (match) => {
				if (match.result.length !== 2) console.warn(`LeftOperator should have only 2 matches, got ${match.result.length}`, match.result);
				return new LeftOperator(match.parent, match.result[0], match.result[1], operation);
			}
		};
	}

	/**
	 * @param {[Item|string]} match
	 */
	function getReadableMatch(match) {
		return match.map(m => typeof m === 'function' ? m.name : m);
	}

	const transfoCalc = [
		[{ match: [/^\s+$/, Item], joinSentences: (match) => { var i = match.result[1]; i.originalSpaceBefore = match.result[0] + (i.originalSpaceBefore || ''); return i; } }],
		[{ match: [Item, /^\s+$/], joinSentences: (match) => { var i = match.result[0]; i.originalSpaceAfter = match.result[1] + (i.originalSpaceAfter || ''); return i; } }],
		[{ match: [EquaLabel, EquaBlob], joinSentences: (match) => new EquaFunction(match.parent, match.result[0], match.result[1]) }],
		[{ match: [EquaLabel], joinSentences: (match) => new EquaVariable(match.parent, match.result[0]) }],
		[pairOperator('^', (a, b) => Math.pow(a, b))],
		[
			pairOperator('*', (a, b) => a * b),
			{ match: [EquaValue, EquaValue], joinSentences: (match) => new PairOperator(match.parent, match.result[0], '', match.result[1], (a, b) => a * b) },
			pairOperator('/', (a, b) => a / b),
			pairOperator('%', (a, b) => a % b),
		],
		[
			pairOperator('+', (a, b) => a + b),
			pairOperator('-', (a, b) => a - b),
		],
		[
			leftOperator('+', v => v),
			leftOperator('-', v => -v)
		],
		[
			pairOperator('<<', (a, b) => binOp.lsh(a, b)),
			pairOperator('>>', (a, b) => binOp.rsh(a, b)),
		],
		[
			pairOperator('<', (a, b) => (a < b) + 0),
			pairOperator('>', (a, b) => (a > b) + 0),
			pairOperator('<=', (a, b) => (a <= b) + 0),
			pairOperator('>=', (a, b) => (a >= b) + 0),
		],
		[
			pairOperator('=', (a, b) => (a == b) + 0),
			pairOperator('==', (a, b) => (a == b) + 0),
			pairOperator('!=', (a, b) => (a != b) + 0),
		],
		[leftOperator('!', v => (!v) + 0)],
		[pairOperator('&', (a, b) => a & b)],
		[pairOperator('^^', (a, b) => a ^ b)],
		[pairOperator('|', (a, b) => a | b)],
		[pairOperator('&&', (a, b) => a && b)],
		[pairOperator('||', (a, b) => a || b)],
	];

	class EquaError extends Error {
		item;
		system;
		data;
		/**
		 * @param {string} message
		 * @param {Item} item
		 */
		constructor(message, item, data) {
			super(message);
			this.item = item;
			this.system = item.getSystem();
			this.data = data;
		}
	}

	var log_level = 1;
	const log = (level, ...content) => (level <= log_level) && console.log(...content);
	const setLogLevel = (level = 0) => log_level = level;

	/**
	 * @param {string} name
	 * @param {Function} func
	 */
	function addCustomFunction(name, func) {
		EquaFunction.customFunctions[name] = func;
	}

	/**
	 * @param {string} equation
	 */
	var getSystem = (equation) => {
		var system = new System(equation);
		return system.simplify();
	}

	return {
		System,
		Item,
		EquaNumber,
		EquaLabel,
		EquaVariable,
		EquaFunction,
		EquaError,
		getSystem,
		setLogLevel,
		addCustomFunction,
	};
})();
