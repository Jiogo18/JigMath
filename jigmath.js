const JigMath = (() => {
	const minmax = (min, x, max) => Math.max(min, Math.min(x, max));
	const distance = (a, b) => Math.sqrt(a * a + b * b);
	const valideOctet = v => MinMax(0, Math.round(v), 255);
	const modulo = (a, b) => a - Math.floor(a / b) * b;

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
			return new Color((valideOctet(r) << 16) | (valideOctet(g) << 8) | valideOctet(b));
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
			this.mainEquation = new Equation([ new BrutSentence(equation) ]);
			this.equations.push(this.mainEquation);

			log(`System created`, this);
		}

		getValue()
		{
			const variablesNotSet = this.variables.filter(v => typeof v.value !== 'number');
			if (variablesNotSet.length > 0)
				console.warn(`Some variables are not set.`, variablesNotSet);
			return this.mainEquation.getValue();
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
				variable = new EquaVariable(name);
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
	}

	class Item
	{
		getLiteral()
		{
			return this.constructor.name;
		}

		static regex = null;
		/**
		 * @param {Equation} equation
		 * @param {number} i
		 */
		static parseSentence(equation, i)
		{
			const sentence = equation.sentences[i];
			if (sentence.constructor !== BrutSentence) return;
			var match = sentence.original.match(this.regex);
			if (!match) return false;
			var splitted = equation.split({iS : i, iC : match.index});
			if (splitted === undefined) return false;
			i += splitted;
			equation.split({iS : i, iC : match[0].length});
			equation.replace(i, new this(match[0]));
		}
	}

	class BrutSentence extends Item
	{
		original;
		getLiteral()
		{
			return this.original;
		}

		/**
		 * @param {string} original
		 */
		constructor(original)
		{
			super();
			this.original = original;
		}
	}

	class Equation extends Item
	{
		getLiteral()
		{
			console.log(this);
			return this.sentences.map(s => s.getLiteral()).join('');
		}

		/**
		 * @type {[Item|BrutSentence]}
		 */
		sentences = [];

		/**
		 * @param {Item[]} sentences
		 */
		constructor(sentences)
		{
			super();
			this.sentences = Array.from(sentences);
			EquationParser.parseEquation(this);
		}

		getValue()
		{
			if (this.sentences.length !== 1) {
				this.simplify();
				if (this.sentences.length < 1)
					return 0;
				else if (this.sentences.length > 1)
					return this.sentences.map(s => s.value || s.getLiteral()).join('');
				// Equation must have 1 sentence at end, but if we want '3*z' we keep it
			}
			const sentence = this.sentences[0];
			if (!EquaValue.prototype.isPrototypeOf(sentence))
				throw new Error(`Last Sentence of Equation must be inherited from EquaValue`);
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
				if (sentence.constructor === BrutSentence) {
					iC += sentence.original.length;
					if (index < iC) return {iS, iC : iC - iS};
				} else {
					if (index == iC) return {iS, iC : 0};
					iC++;
				}
			}
			return null;
		}

		/**
		 * @param {number} index Char position
		 */
		at(index)
		{
			const position = this.getSentencePosition(index);
			if (!position) return;
			const sentence = this.sentences[position.iS];
			return sentence.constructor === BrutSentence ? sentence.original[position.iC] : sentence;
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
			logdebug('split', position, sentence);
			if (sentence.constructor !== BrutSentence) return; // middle of a number
			console.log('split2');
			if (position.iC < 0 || sentence.original.length <= position.iC) return false; // no changes
			console.log('split3');
			var sentence_1 = new BrutSentence(sentence.original.substring(0, position.iC));
			var sentence_2 = new BrutSentence(sentence.original.substring(position.iC));
			const sentence_1_empty = sentence_1.original.match(/^\s*$/);
			const sentence_2_empty = sentence_2.original.match(/^\s*$/);
			console.log(sentence_1, sentence_2, sentence, position);
			console.log(sentence_1_empty, sentence_2_empty);
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
		 * @param {number} i Sentence position
		 * @param {Item} value new Sentence (inherit)
		 */
		replace(i, value, length = 1)
		{
			if (!Item.prototype.isPrototypeOf(value))
				throw new Error(`Invalid value must be an object derived from Sentence : ${value}`);

			if (length == 1) {
				logdebug(`Replaced`, this.sentences[i], `with`, value);
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
				if (sentence.constructor === BrutSentence)
					return sentence.original.indexOf(haveToMatch);
				return (sentence.getLiteral().toString() === haveToMatch) ? 0 : -1;

			} else if (haveToMatch?.constructor === RegExp) {
				if (sentence.constructor === BrutSentence)
					return sentence.original.match(haveToMatch)?.index;
				return sentence.getLiteral().toString().match(new RegExp('^\\s*' + haveToMatch.source + '\\s*$'))?.index;
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
				if (match !== -1) return {iS : i, iC : match};
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
					iS++;
				}
				if (doMatch) {
					return {
						result : this.getRange(start, iS),
						index : start,
						input : sentencesType
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
		 * @param {Equation} equation
		 */
		static parseEquation(equation)
		{
			equation = EquationParser.parseIntoSentences(equation);
			equation = EquationParser.parseIntoBlobs(equation);
			equation = EquationParser.joinEquation(equation); // TODO: activate it here
			return equation;
		}

		/**
		 * Step 1 : parse the equation into 'Sentence' specitic objects
		 * @param {Equation} equation
		 */
		static parseIntoSentences(equation)
		{
			var changed = false;
			const equaParse = [ EquaHexaNumber, EquaBinNumber, EquaLabel, EquaNumber, EquaOperator ];
			for (let i = 0; i < equation.sentences.length;) {
				const sentence = equation.sentences[i];
				if (sentence.constructor === BrutSentence) {
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
			const charEnd = EquaBlobLimitEnd.chars[charI];
			var endBlob = equation.indexOf(charEnd, 0);
			if (!endBlob) return;
			console.log('blobExtractEndCharacter', endBlob);
			// endBlob.iC++; // pb : avec "img(y,z+min(triangle(t-x,16,8,1),0),0)" on a le 0 qui se cole à la parenthèse
			if (equation.split(endBlob)) endBlob.iS++;
			equation.replace(endBlob.iS, new EquaBlobLimitEnd(charEnd));
			return endBlob;
		}
		/**
		 * Find the last opening character until the indexEnd ( [ {
		 * @param {Equation} equation
		 * @param {number} charI EquaBlobLimit character index/id
		 */
		static blobExtractBeginCharacter(equation, charI, indexEnd)
		{
			const charBegin = EquaBlobLimitBegin.chars[charI];
			var beginBlob = equation.lastIndexOf(charBegin, indexEnd);
			if (!beginBlob) return;
			if (equation.split(beginBlob)) beginBlob.iS++;
			equation.replace(beginBlob.iS, new EquaBlobLimitBegin(charBegin));
			return beginBlob;
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
				// Here there is no EquaBlobLimitBegin and EquaBlobLimitEnd
				changes = false;

				for (const charI in EquaBlobLimitEnd.chars) {
					// Find the last character
					var endBlob = EquationParser.blobExtractEndCharacter(equation, charI);
					if (!endBlob) continue;

					// Find the first character
					var beginBlob = EquationParser.blobExtractBeginCharacter(equation, charI, endBlob.iS);
					if (!beginBlob) {
						console.error(`BlobLimitBegin not found`, equation, {charI, beginBlob, endBlob});
						throw new Error(`L'équation a trouvé un BlobLimitEnd mais pas son BlobLimitBegin`);
					}

					// Find the Blob
					const match = equation.getRange(beginBlob.iS, endBlob.iS + 1);
					if (!match?.length) {
						console.error(`Blob not found`, equation, {charI, beginBlob, endBlob, match});
						throw new Error(`L'équation a trouvé des BlobLimit mais n'a pas réussi à délimiter le Blob`);
					}

					const replaceBy = new EquaBlob(match);
					equation.replace(beginBlob.iS, replaceBy, match.length);
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
			do {
				match = null;
				for (const transfos of transfoCalc) {
					var firstTransfo;
					for (const transfo of transfos) {
						let transfoMatch = equation.match(transfo.match);
						if (transfoMatch && (!match || transfoMatch.index < match.index)) {
							logdebug(`match found`, transfoMatch, transfo);
							match = transfoMatch;
							firstTransfo = transfo;
						}
					}
					if (match) {
						const replaceBy = firstTransfo.joinSentences(match);
						equation.replace(match.index, replaceBy, match.result.length);
						break;
					}
				}
			} while (match);

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
		 * @param {string} sentence
		 */
		constructor(sentence)
		{
			super();
			log(`new EquaSentence(${sentence})`);
			this.name = sentence.match(/\s*(.+)\s*/)[1];
		}

		static regex = /[a-z_]\w*/i;
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
		 * @param {string} sentence
		 */
		constructor(sentence)
		{
			super();
			this.number = typeof sentence === 'number' ? sentence : parseFloat(sentence);
			if (isNaN(this.number)) throw new Error(`NaN EquaNumber : '${sentence}'`);
		}

		static regex = /\d+(?:[,\.]\d+)?(?:E[\+\-]?\d+)?/i;
	}

	class EquaHexaNumber extends EquaNumber
	{
		/**
		 * @param {string} sentence
		 */
		constructor(sentence)
		{
			super(parseInt(sentence.replace(/^#/, '').replace(/^0x/i, ''), 16));
			console.log(sentence);
		}
		static regex = /(#|0x)[\da-f]+/i;
	}

	class EquaBinNumber extends EquaNumber
	{
		/**
		 * @param {string} sentence
		 */
		constructor(sentence)
		{
			super(parseInt(sentence.replace(/^0b/i, ''), 2));
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
			return this.number ?? undefined;
		}
		set value(value)
		{
			this.number = value;
		}

		/**
		 * @param {string} name
		 */
		constructor(name)
		{
			super();
			this.name = name;
			this.number = undefined;
		}
	}

	class EquaOperator extends Item
	{
		/**
		 * @param {string} char
		 */
		operator;
		getLiteral()
		{
			return this.operator;
		}
		static regex = /([\+\-\*\/\%])/;
		constructor(operator)
		{
			super();
			this.operator = operator;
		}
	}

	class EquaBlobLimitEnd extends Item
	{
		/**
		 * @param {string} char
		 */
		char;
		getLiteral()
		{
			return this.char;
		}
		static chars = ")]}";
		static match = "([\)\]\}])";
		constructor(char)
		{
			super();
			this.char = char;
		}
	}

	class EquaBlobLimitBegin extends Item
	{
		char;
		getLiteral()
		{
			return this.char;
		}
		static chars = "([{";
		static match = "([\(\[\{])";
		/**
		 * @param {string} char
		 */
		constructor(char)
		{
			super();
			this.char = char;
		}
	}

	class EquaBlob extends EquaValue
	{
		getLiteral()
		{
			return this.begin.getLiteral() + this.params.map(s => s.getLiteral()).join(',') + this.end.getLiteral();
		}

		/**
		 * @type {EquaBlobLimitBegin}
		 */
		begin;
		/**
		 * @type {EquaBlobLimitEnd}
		 */
		end;
		/**
		 * @type {Equation[]}
		 */
		params;
		/**
		 * @param {[Item|BrutSentence]} value
		 */
		constructor(value)
		{
			super();
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
				if (sentence.constructor !== BrutSentence) {
					param.push(sentence);
					continue;
				}
				var text = sentence.original;
				while (text.includes(',')) {
					var match = sentence.original.match('(.*),(.*)');
					var before = match[1];
					var after = match[2];
					if (before !== '') param.push(before);
					if (param.length === 0) param.push(0);
					this.params.push(new Equation(param));
					param = []; // add a parameter
					text = after;
				}
				if (text != '') param.push(after);
			}
			if (param.length != 0) this.params.push(new Equation(param));
		}

		get value()
		{
			if (this.params.length === 0) return 0;
			var firstParam = this.params[0];
			if (firstParam.sentences.length === 0)
				return 0;
			return firstParam.getValue();
		}
	}

	class PairOperator extends EquaValue
	{
		getLiteral()
		{
			return '(' + this.valueLeft.getLiteral() + this.operator + this.valueRight.getLiteral() + ')';
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
		 * @param {{result:Item[]}} match
		 * @param {Function} operation
		 */
		constructor(match, operation)
		{
			super();
			this.valueLeft = match.result[0];
			this.operator = match.result[1].getLiteral();
			this.valueRight = match.result[2];
			this.operation = operation;
			if (match.result.length !== 3) {
				console.warn(`PairOperator should have only 3 matches, got ${match.result.length}`, match.result);
			}
		}
		get value()
		{
			return this.operation(this.valueLeft.value, this.valueRight.value);
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
			joinSentences : (match) => new PairOperator(match, operation)
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
		 * @param {EquaLabel} label
		 * @param {EquaBlob} blob
		 */
		constructor(label, blob)
		{
			super();
			this.name = label.name.toLocaleLowerCase();
			this.blob = blob;

			if (Math[this.name])
				this.function = Math[this.name];
			else if (EquaFunction.functions[this.name])
				this.functoin = EquaFunction.functions[this.name];
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
			rgb: (r, g, b) => (MinMax(0, r, 255) << 16) | (MinMax(0, g, 255) << 8) | MinMax(0, b, 255),
			red: c => (c & 0xff0000) >> 16,
			green: c => (c & 0x00ff00) >> 8,
			blue: c => c & 0x0000ff,
			huerotate: (c, angle) => new Color(c).hue_rotation(angle).decValue,
			lumiere: (c, lumiere) => new Color(c).lumiere(lumiere).decValue
		};

		get value()
		{
			if (typeof this.function === 'function')
				return this.function(...this.blob.params.map(p => p.getValue()));
			else
				return this.name + '(' + this.blob.params.map(p => p.getValue()) + ')';
		}
	}

	const transfoCalc = [
		[
			{match : [ EquaLabel, EquaBlob ], joinSentences : (match) => new EquaFunction(match.result[0], match.result[1])},
		],
		[
			{match : [ '(', EquaValue, ')' ], joinSentences : match => match.result[1]},
			{match : [ '(', ')' ], joinSentences : match => new EquaNumber('0')},
		],
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
			pairOperator('<<', (a, b) => a << b),
			pairOperator('>>', (a, b) => a >> b),
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
	 */
	return (equation, debug) => {
		equation = equation.replace(/\s+/g, ' ');

		log = debug !== false ? console.log : () => null;
		if (debug === 'advanced') logdebug = console.log;

		return new System(equation);
	};
})();
