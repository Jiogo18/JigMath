const JigMath = (() => {
	const minmax = (min, x, max) => Math.max(min, Math.min(x, max));
	const distance = (a, b) => Math.sqrt(a * a + b * b);
	const valideOctet = v => minmax(0, Math.round(v), 255);
	const modulo = (a, b) => a - Math.floor(a / b) * b;
	const areValidNumbers = (...list) => list.every(n => typeof n === 'number' && !isNaN(n));
	const binOp = {
		// By default bin operators transform NaN in 0, we want to keep NaN
		lsh : (a, b) => areValidNumbers(a, b) ? (a << b) : NaN,
		rsh : (a, b) => areValidNumbers(a, b) ? (a >> b) : NaN,
		and : (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a & b, 0) : NaN,
		xor : (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a ^ b, 0) : NaN,
		or : (...list) => areValidNumbers(...list) ? list.reduce((a, b) => a | b, 0) : NaN,
	}

	class Color
	{
		decValue;
		get r()
		{
			return (this.decValue & 0xff0000) >> 16;
		}
		get g()
		{
			return (this.decValue & 0x00ff00) >> 8;
		}
		get b()
		{
			return this.decValue & 0x0000ff;
		}
		/**
		 * @param {number} value
		 */
		constructor(value)
		{
			this.decValue = value;
		}
		static fromRGB(r, g, b)
		{
			return new Color(binOp.or(binOp.lsh(valideOctet(r), 16), binOp.lsh(valideOctet(g), 8), valideOctet(b)));
		}
		hue_rotation(angle)
		{
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
		lumiere(lumiere)
		{
			return Color.fromRGB(this.r * lumiere, this.g * lumiere, this.b * lumiere);
		}
	}

	class System
	{
		/**
		 * @type {Equation}
		 */
		mainEquation;

		/**
		 * @type {Equation[]}
		 */
		equations = [];

		/**
		 * @type {EquaVariable[]}
		 */
		variables = [];

		/**
		 * @param {string} equation
		 */
		constructor(equation)
		{
			this.mainEquation = EquationParser.parseEquation(this, [ equation ]);
			this.equations.push(this.mainEquation);

			log(`System created`, this);
		}

		getValue()
		{
			const variablesNotSet = this.variables.filter(v => typeof v.value !== 'number');
			if (variablesNotSet.length > 0)
				console.warn(`Some variables are not set.`, variablesNotSet);
			return this.mainEquation.value;
		}

		/**
		 * @param {string} name
		 */
		getVariable(name)
		{
			return this.variables.find(v => v.name === name);
		}

		/**
		 * @param {string} name
		 * @param {number} value
		 */
		setVariable(name, value)
		{
			var v = this.getVariable(name);
			if (v) v.value = value;
		}

		/**
		 * @param {string} name
		 */
		declareVariable(name)
		{
			var variable = this.getVariable(name);
			if (!variable) {
				variable = new EquaVariable(this, name);
				this.variables.push(variable);
			}
			for (const equation of this.equations) {
				for (const i in equation.sentences) {
					const s = equation.sentences[i];
					if (EquaLabel.prototype.isPrototypeOf(s) && s.name === name) {
						equation.sentences[i] = variable;
					}
				}
			}
		}

		getSystem()
		{
			return this;
		}
	}

	class Item
	{
		#parent;

		getLiteral()
		{
			return this.constructor.name;
		}

		/**
		 * @param {Item} item
		 */
		static literal(item)
		{
			if (typeof item.getLiteral === 'function') return item.getLiteral();
			if (typeof item === 'string') return item;
			item.toString();
		}

		static regex = null;
		/**
		 * @param {Equation} equation
		 * @param {number} i
		 */
		static parseSentence(equation, i)
		{
			const sentence = equation.sentences[i];
			if (typeof sentence !== 'string') return;
			var match = sentence.match(this.regex);
			if (!match) return false;
			var splitted = equation.split({iS : i, iC : match.index});
			if (splitted === undefined) return false;
			i += splitted;
			equation.split({iS : i, iC : match[0].length});
			equation.replace(i, new this(equation, match[0]));
		}

		/**
		 * @param {Item} parent
		 */
		constructor(parent)
		{
			this.#parent = parent;
			if (!parent) throw new Error(`Item without parent`);
		}

		get parent()
		{
			return this.#parent;
		}

		getSystem()
		{
			return this.#parent.getSystem();
		}
	}

	class Equation extends Item
	{
		getLiteral()
		{
			return this.sentences.map(s => Item.literal(s)).join('');
		}

		/**
		 * @type {[Item|string]}
		 */
		sentences = [];

		/**
		 * @param {Item} parent
		 * @param {Item[]} sentences
		 */
		constructor(parent, sentences)
		{
			super(parent);
			this.sentences = Array.from(sentences);
		}

		get value()
		{
			if (this.sentences.length !== 1) {
				this.simplify();
				if (this.sentences.length < 1)
					return 0;
				else if (this.sentences.length > 1)
					return this.sentences.map(s => s.value || Item.literal(s)).join('');
				// Equation must have 1 sentence at end, but if we want '3*z' we keep it
			}
			const sentence = this.sentences[0];
			return sentence.value;
		}

		/**
		 * @param {number|{iS:number,iC:number}} index Char position
		 */
		getSentencePosition(index)
		{
			if (typeof index === 'object') return index;
			if (index < 0) return null;
			for (let iS = 0, iC = 0; iS < this.sentences.length; iS++) {
				const sentence = this.sentences[iS];
				if (typeof sentence === 'string') {
					if (index < iC) return {iS, iC : iC - iS};
					iC += sentence.length;
				} else {
					if (index == iC) return {iS, iC : 0};
					iC++;
				}
			}
			return null;
		}

		/**
		 * @param {number} start Sentence position
		 * @param {number} end Sentence position
		 */
		getRange(start, end)
		{
			return this.sentences.slice(start, end);
		}

		/**
		 * @param {{iS:number,iC:number}} position Sentence & Char position
		 */
		split(position)
		{
			if (!position) return;
			const sentence = this.sentences[position.iS];
			if (typeof sentence !== 'string') return;							 // middle of a number
			if (position.iC < 0 || sentence.length <= position.iC) return false; // no changes
			var sentence_1 = sentence.substring(0, position.iC);
			var sentence_2 = sentence.substring(position.iC);
			const sentence_1_empty = sentence_1.match(/^\s*$/);
			const sentence_2_empty = sentence_2.match(/^\s*$/);
			if (sentence_1_empty && sentence_2_empty) {
				this.sentences.splice(position.iS, 1);
				return false;
			} else if (sentence_1_empty) {
				this.sentences[position.iS] = sentence_2;
				return false;
			} else if (sentence_2_empty) {
				this.sentences[position.iS] = sentence_1;
				return false;
			} else {
				this.sentences.splice(position.iS, 1, sentence_1, sentence_2);
				return true;
			}
		}

		/**
		 * @param {{iS:number,iC:number}} position Sentence & Char position
		 * @param {number} length Split length
		 */
		doubleSplit(position, length)
		{

			if (this.split(position)) {
				// split before
				position.iC -= this.sentences[position.iS].length;
				position.iS++;
			}
			position.iC += length;
			this.split(position); // split after
			position.iC = 0;
		}

		/**
		 * @param {number} i Sentence position
		 * @param {Item} value new Sentence (inherit)
		 */
		replace(i, value, length = 1)
		{
			if (!Item.prototype.isPrototypeOf(value))
				throw new Error(`Invalid value must be an object derived from Sentence : ${value}`);

			if (length == 1) {
				logdebug(`Replaced`, Array.from(this.sentences[i]), `with`, value);
				this.sentences[i] = value;
			} else {
				logdebug(`Replaced`, Array.from(this.getRange(i, i + length)), `with`, value);
				this.sentences.splice(i, length, value);
			}
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 * @return `0` if this element, `-1` if not
		 */
		matchAt(haveToMatch, index)
		{
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
					return sentence.match(haveToMatch)?.index;
				return Item.literal(sentence).match(new RegExp('^\\s*' + haveToMatch.source + '\\s*$'))?.index;
			}
			console.warn(`haveToMatch must be a Class or a string`, haveToMatch);
			return -1;
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 */
		indexOf(haveToMatch, index)
		{
			for (let i = index; i < this.sentences.length; i++) {
				var match = this.matchAt(haveToMatch, i);
				if (match !== -1) return {iS : i, iC : match};
			}
			return null;
		}

		/**
		 * @param {typeof Item|string|null} haveToMatch
		 * @param {number} index
		 */
		lastIndexOf(haveToMatch, index)
		{
			for (let i = index; i >= 0; i--) {
				var match = this.matchAt(haveToMatch, i);
				if (match !== -1) {
					const sentence = this.sentences[i];
					console.log(sentence);
					if (typeof sentence === 'string')
						match = sentence.lastIndexOf(haveToMatch);
					return {iS : i, iC : match};
				}
			}
			return null;
		}

		/**
		 * @param {[typeof Item|string]} sentencesType
		 * @param {number} start
		 */
		match(sentencesType, start = 0)
		{
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
						result : this.getRange(start, iS),
						index : start,
						input : sentencesType,
						parent : this
					};
				}
				start++;
			}
			return null;
		}

		simplify()
		{
			// TODO: remove it and set something to simplify values like (2+2) instead
			// ça peut être juste dans getValue en faite... si on a une inconnue ça retourne '4*x' comme si c'était good
			// donc fusion de simplify et getValue pour obtenir le résultat final
			// EquationParser.joinEquation(this);
		}
	}

	class EquationParser
	{
		/**
		 * @param {Item} parent
		 * @param {[Item|string]} sentences
		 */
		static parseEquation(parent, sentences)
		{
			var equation = new Equation(parent, sentences);
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
		static parseIntoSentences(equation)
		{
			var changed = false;
			const equaParse = [ EquaHexaNumber, EquaBinNumber, EquaLabel, EquaNumber ];
			for (let i = 0; i < equation.sentences.length;) {
				const sentence = equation.sentences[i];
				if (!sentence) {
					console.error(`pb avec les Brut?`, sentence, equation, i);
				}
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

			logdebug('');
			log('Equation parsed: ', {literal : equation.getLiteral(), sentences : Array.from(equation.sentences)});
			logdebug('');
			return equation;
		}

		/**
		 * Find the first closing character ) ] }
		 * @param {Equation} equation
		 * @param {number} charI EquaBlobLimit character index/id
		 */
		static blobExtractEndCharacter(equation, charI)
		{
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
		static blobExtractBeginCharacter(equation, charI, blobEnd)
		{
			const charBegin = EquaBlob.beginLimits[charI];
			var blobBegin = equation.lastIndexOf(charBegin, blobEnd.iS);
			if (!blobBegin) return;
			var previousBeginPos = blobBegin.iS;
			console.log('blobExtractBeginCharacter', blobBegin);
			equation.doubleSplit(blobBegin, charBegin.length);
			var deltaPos = blobBegin.iS - previousBeginPos;
			blobEnd.iS += deltaPos;
			return blobBegin;
		}
		/**
		 * Step 2 : group Blob
		 * extract the groups of () et [] et {}
		 * @param {Equation} equation
		 */
		static parseIntoBlobs(equation)
		{
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
						console.error(`BlobLimitBegin not found`, equation, {charI, blobBegin, blobEnd});
						throw new Error(`L'équation a trouvé un BlobLimitEnd mais pas son BlobLimitBegin`);
					}

					// Find the Blob
					const match = equation.getRange(blobBegin.iS, blobEnd.iS + 1);
					if (!match?.length) {
						console.error(`Blob not found`, equation, {charI, blobBegin, blobEnd, match});
						throw new Error(`L'équation a trouvé des BlobLimit mais n'a pas réussi à délimiter le Blob`);
					}

					const replaceBy = new EquaBlob(equation, match);
					equation.replace(blobBegin.iS, replaceBy, match.length);
					changes = true;
					break;
				}
			} while (changes);

			logdebug('');
			log('Equation blobed: ', {literal : equation.getLiteral(), sentences : Array.from(equation.sentences)});
			logdebug('');
			return equation;
		}

		/**
		 * Step 3 : group Operators
		 * @param {Equation} equation
		 */
		static joinEquation(equation)
		{
			var match = null;
			for (const transfos of transfoCalc) {
				do {
					match = null;
					var firstTransfo = null;
					for (const transfo of transfos) {
						let transfoMatch = equation.match(transfo.match);
						if (transfoMatch && (!match || transfoMatch.index < match.index)) {
							logdebug(`joinEquation found match with`, getReadableMatch(transfo.match), {transfoMatch, transfo});
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

			logdebug('');
			log('Equation joined: ', {literal : equation.getLiteral(), sentences : Array.from(equation.sentences)});
			logdebug('');
			return equation;
		}
	}

	class EquaLabel extends Item
	{
		getLiteral()
		{
			return this.name;
		}

		name;
		/**
		 * @param {Item}
		 * @param {string} sentence
		 */
		constructor(parent, sentence)
		{
			super(parent);
			log(`new EquaSentence(${sentence})`);
			this.name = sentence.match(/\s*(.+)\s*/)[1];
		}

		static regex = /[a-z_]\w*/i;

		get value()
		{
			return this.name;
		}
	}

	class EquaValue extends Item
	{
		get value()
		{
			return NaN;
		}
		set value(value)
		{
			throw new Error(`EquaValue can't be changed`);
		}
	}

	class EquaNumber extends EquaValue
	{
		getLiteral()
		{
			return this.number;
		}

		/**
		 * @type {number}
		 */
		number;
		get value()
		{
			return this.number;
		}

		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence)
		{
			super(parent);
			this.number = typeof sentence === 'number' ? sentence : parseFloat(sentence);
			if (isNaN(this.number)) throw new Error(`NaN EquaNumber : '${sentence}'`);
		}

		static regex = /\d+(?:\.\d+)?(?:E[\+\-]?\d+)?/i;
	}

	class EquaHexaNumber extends EquaNumber
	{
		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence)
		{
			super(parent, parseInt(sentence.replace(/^#/, '').replace(/^0x/i, ''), 16));
			console.log(sentence);
		}
		static regex = /(#|0x)[\da-f]+/i;
	}

	class EquaBinNumber extends EquaNumber
	{
		/**
		 * @param {Item} parent
		 * @param {string} sentence
		 */
		constructor(parent, sentence)
		{
			super(parent, parseInt(sentence.replace(/^0b/i, ''), 2));
		}
		static regex = /0b[01]+/i;
	}

	class EquaVariable extends EquaValue
	{
		getLiteral()
		{
			return this.name;
		}

		/**
		 * @type {string}
		 */
		name;
		/**
		 * @type {number}
		 */
		number;
		get value()
		{
			return this.number ?? this.name;
		}
		set value(value)
		{
			this.number = value;
		}

		/**
		 * @param {Item} parent
		 * @param {string} name
		 */
		constructor(parent, name)
		{
			super(parent);
			this.name = name;
			this.number = undefined;
		}
	}

	class EquaBlob extends EquaValue
	{
		static beginLimits = "([{";
		static endLimits = ")]}";

		getLiteral()
		{
			return Item.literal(this.begin) + this.params.map(s => Item.literal(s)).join(',') + Item.literal(this.end);
		}

		/**
		 * @type {string}
		 */
		begin;
		/**
		 * @type {Item[]}
		 */
		params;
		/**
		 * @type {string}
		 */
		end;
		/**
		 * @param {Item} parent
		 * @param {[Item|string]} value
		 */
		constructor(parent, value)
		{
			super(parent);
			// un blob est composé de [EquaBlobLimit,EquaValue,EquaBlobSeparator,...,EquaBlobLimit]
			// => un blob est différent de EquaValue car ça permet d'avoir des opérateurs spé : 3*(1,2) = (3,6)
			// EquaFonction : [EquaLabel,EquaBlob]
			// le reste des EquaLabel => EquaVariable (permet d'avoir le simplify() autrement)

			// le joinEquation : doit faire les EquaFonction et les EquaVariables
			// le simplify a un nouvel objectif : simplifier les PairOperator quand ça peut être simplifié (*0 par ex)

			value = Array.from(value);
			this.begin = value.shift();
			this.end = value.pop();
			this.params = [];
			var param = [];
			for (var sentence of value) {
				if (typeof sentence !== 'string') {
					param.push(sentence);
					continue;
				}
				var text = sentence;
				while (text.includes(',')) {
					var match = sentence.match('(.*),(.*)');
					var before = match[1];
					var after = match[2];
					if (before !== '') param.push(before);
					if (param.length === 0) param.push(0);
					this.params.push(EquationParser.parseEquation(this, param));
					param = []; // add a parameter
					text = after;
				}
				if (text != '') param.push(text);
			}
			if (param.length != 0) this.params.push(EquationParser.parseEquation(this, param));
		}

		get value()
		{
			if (this.params.length === 0) return 0;
			if (this.params.length === 1)
				return this.params[0].value;
			if (this.params.length > 1)
				return this.getLiteral();
		}
	}

	class PairOperator extends EquaValue
	{
		getLiteral()
		{
			return '(' + Item.literal(this.valueLeft) + this.operator + Item.literal(this.valueRight) + ')';
		}

		/**
		 * @type {EquaValue}
		 */
		valueLeft;
		/**
		 * @type {EquaValue}
		 */
		valueRight;
		operator;
		operation;
		/**
		 * @param {Item} parent
		 * @param {{result:Item[]}} match
		 * @param {Function} operation
		 */
		constructor(parent, match, operation)
		{
			super(parent);
			this.valueLeft = match.result[0];
			this.operator = Item.literal(match.result[1]).match(/[^\s]+/)[0];
			this.valueRight = match.result[2];
			this.operation = operation;
			if (match.result.length !== 3) {
				console.warn(`PairOperator should have only 3 matches, got ${match.result.length}`, match.result);
			}
		}
		get value()
		{
			const a = this.valueLeft.value;
			const b = this.valueRight.value;
			if (areValidNumbers(a, b)) {
				var result = this.operation(a, b);
				if (areValidNumbers(result))
					return result;
			}
			return '(' + this.valueLeft.value + this.operator + this.valueRight.value + ')';
		}
	}

	/**
	 * @param {string} char
	 * @param {Function} operation
	 */
	function pairOperator(char, operation)
	{
		return {
			match : [ EquaValue, char, EquaValue ],
			joinSentences : (match) => new PairOperator(match.parent, match, operation)
		};
	}

	class EquaFunction extends EquaValue
	{
		getLiteral()
		{
			return this.name + this.blob.getLiteral();
		}

		name;
		blob;
		function;

		/**
		 * @param {Item} parent
		 * @param {EquaLabel} label
		 * @param {EquaBlob} blob
		 */
		constructor(parent, label, blob)
		{
			super(parent);
			this.name = label.name.toLocaleLowerCase();
			this.blob = blob;

			if (Math[this.name])
				this.function = Math[this.name];
			else if (EquaFunction.functions[this.name])
				this.function = EquaFunction.functions[this.name];
			else if (EquaFunction.customFunctions[this.name])
				this.function = EquaFunction.customFunctions[this.name];
			else
				console.warn('Unknow function', this.name);
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

		get value()
		{
			var values = this.blob.params.map(p => p.value);
			if (areValidNumbers(values) && typeof this.function === 'function') {
				var result = this.function(...values);

				if (areValidNumbers(result))
					return result;
			}
			return this.name + '(' + values.join(',') + ')';
		}
	}

	/**
	 * @param {[Item|string]} match
	 */
	function getReadableMatch(match)
	{
		return match.map(m => typeof m === 'function' ? m.name : m);
	}

	const transfoCalc = [
		[ {match : [ EquaLabel, EquaBlob ], joinSentences : (match) => new EquaFunction(match.parent, match.result[0], match.result[1])} ],
		[ {match : [ EquaLabel ], joinSentences : (match) => new EquaVariable(match.parent, match.result[0].name)} ],
		[ pairOperator('^', (a, b) => Math.pow(a, b)) ],
		[
			pairOperator('*', (a, b) => a * b),
			pairOperator('/', (a, b) => a / b),
			pairOperator('%', (a, b) => a % b),
		],
		[
			pairOperator('+', (a, b) => a + b),
			pairOperator('-', (a, b) => a - b),
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
		[ pairOperator('&', (a, b) => a & b) ],
		[ pairOperator('^^', (a, b) => a ^ b) ],
		[ pairOperator('|', (a, b) => a | b) ],
		[ pairOperator('&&', (a, b) => a && b) ],
		[ pairOperator('||', (a, b) => a || b) ],
	];

	var log = console.log;
	var logdebug = (...args) => null;
	/**
	 * @param {string} equation
	 * @param {{name: string, func: Function}[]} customFunctions
	 */
	return (equation, customFunctions, debug) => {
		equation = equation.replace(/\s+/g, ' ');

		log = debug !== false ? console.log : () => null;
		if (debug === 'advanced') logdebug = console.log;

		customFunctions?.forEach(f => EquaFunction.customFunctions[f.name] = f.func);

		return new System(equation);
	};
})();
