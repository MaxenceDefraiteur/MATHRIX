
// Les deux fonctions qui suivent sont tirées de https://gist.github.com/mjackson/5311256.

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ r * 255, g * 255, b * 255 ];
}





let canvas;
let context;

let w, h;

let cw = 32, ch = 32; // Dimensions fixes de tout caractère
let rain_w = 30, rain_h = 20; // Dimensions de la matrice de caractères
let matrix; // La matrice des caractères
let refresh_indices; // ordonnée de rafraîchissement de chaque colonne (monte jusqu'à boucler à 0).
let refresh_rates; // Durée en ms de rafraîchissement de chaque colonne.
let last_paint_cols; // Dernier rafraîchissement de chaque colonne.
let clr_blink = 'white'; // Couleur du clignottement d'un nouveau char : blanc par défaut.

let couleur_defaut = [0, 255, 0]; // Nouvelle couleur à choisir par défaut.
let colonnes_nouv_couleur; // Nouvelle couleur acceptée par chaque colonne. Fonctionnement actuel : peut prendre du temps pour rendre un effet « d'infection ».

/*
    Matrice de caractères. Même dimensions que la matrice de base, comprend simplement des null ou caractères qui auront obligation de s'afficher
    à la place de texte aléatoire. Cela permet notamment l'affichage de messages cachés.
*/
let mandatory_print_temp;
let mandatory_print_perm; // Pareil mais destiné à laisser du texte persistant.

// La durée d'affichage des caractères. Le MSG_DUREE_COURTE est la valeur par défaut, et MSG_DUREE_LONGUE est celles des messages dont les caractères ont un affichage persistant.
const MSG_DUREE_COURTE = 1;
const MSG_DUREE_LONGUE = 10;

let image_affichee; // L'image affichée au centre de l'écran, si bien qu'elle ne soit pas null.

let stop_rain = false; // Qui décide si oui ou non lors de l'arrivée en bas du curseur de rafraîchissement la pluie doit s'arrêter.
let cols_stop; // L'arrêt progressif de chaque colonne puisque chacune possède son rythme d'arrêt.

let last_paint;

class Char {
	
	// Note : lifespan ne représente pas une durée totale d'affichage mais plutôt un coefficient d'estompage : plus le coeff est élevé, plus le caractère restera affiché longtemps.
	constructor(value, birth, base_color, lifespan) {
		this.value = value;
		this.birth = birth;
		this.base_color = base_color;
		this.lifespan = lifespan;
	}
	
}

let abc = [
	[.7,  'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜｲｸﾁﾄﾉﾌﾍﾖﾙﾚﾛﾝ日'.split('')],
	[.1, 'αβγδεζηθιλμνξπρςστυφχψω'.split('')],
	[.05, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')],
	[.1,  '0123456789'.split('')],
	[.05, 'áÁàÀȧȦâäǎăāãåąⱥấầắằǡǻǟẫẵảȁȃẩẳạḁậặḃƀɓḅḇƃḂɃƁḄḆƂćċĉčçȼḉƈĆĊĈČÇȻḈƇḋďḑđƌɗḍḓḏðǳǆḊĎḐĐƋƊḌḒḎÐǱǲǄǅéèėêëěĕēẽęȩɇếềḗḕễḝẻȅȇểẹḙḛệÉÈĖÊËĚĔĒẼĘȨɆẾỀḖḔỄḜẺȄȆźżẑžƶȥẓẕⱬỂẸḘḚỆḟƒƑḞ℉ǵġĝǧğḡģǥɠǴĠĜǦĞḠĢǤƓḣĥḧȟḩħḥḫⱨḢĤḦȞḨĦḤḪⱧíìıîïǐĭīĩįɨḯỉȉȋịḭĳÍÌİÎÏǏĬĪĨĮƗḮỈȈṼṾƲȊỊḬĲĵǰɉĴɈḱŹŻẐŽƵȤẒẔⱫǩķƙḳḵⱪḰǨĶƘḲḴⱩĺŀľⱡļƚłḷÝỲẎŶŸȲỸɎỶƳỴḽḻḹǉĹẋẍĿĽⱠĻȽŁÚÙÛÜǓŬŪŨŮŲŰɄǗǛǙṸǕṺỦȔȖƯỤṲỨỪṶṴỮỬýỳẏŷÿȳỹẙɏỷƴỵỰḶḼḺḸǇǈḿṁṃḾṀṂńǹṅňñņɲƞṇṋṉǌŋŃúùûüǔŭṽṿʋūũůẃẁẂẀẆŴẄẈⱲẇŵẅẘẉⱳųűʉǘǜǚṹǖṻủȕȗưụṳứừṷṵữửựǸṄŇÑŅƝẊẌȠṪŤŢƬṬƮȚṰṮȾÞŦṆṊṈǊǋŊóòȯôöǒŏōõǫőốồøṓṑȱṍȫỗṏǿȭǭỏȍȏơổọớờỡộƣởợœÓÒȮÔÖǑŎŌÕǪŐỐỒØṒṐȰṌȪỖṎǾȬǬỎȌȎƠỔỌỚỜỠỘƢỞỢŒṕṗᵽƥṔṖⱣƤɋɊŕṙřŗɍɽȑȓṛṟṝŔṘŘŖɌⱤȐȒṚṞṜśṡŝšşṥṧṣșṩßŚṠŜŠŞṤṦṢȘṫẗťţƭṭʈțṱṯⱦþŧṨẞ'.split('')]
];

let abc_wsum;

// Sélection aléatoire (pondéré) de symboles issus de différents alphabets.
function rdmChar() {
	let rdm_w = Math.random() * abc_wsum;
	let csum = 0;
	let i = 0;
	while (csum <= rdm_w) {
		csum += abc[i][0];
		i++;
	}
	let chosen_abc = abc[i-1][1];
	return chosen_abc[Math.floor(chosen_abc.length * Math.random())];
}


function clrGrad(clr1, clr2, t) {
	return [clr1[0] * t + clr2[0] * (1-t), clr1[1] * t + clr2[1] * (1-t), clr1[2] * t + clr2[2] * (1-t)];
}


window.onload = init;

function init(){
	
	// Init le pre backend
	
	abc_wsum = 0;
	for (let i = 0; i < abc.length; i++) {
		abc_wsum += abc[i][0];
	}
	
	// Initialiser le backend
	
	let now = Date.now();
	
	matrix = Array(rain_w);
	refresh_indices = Array(rain_w);
	refresh_rates = Array(rain_w);
	last_paint_cols = Array(rain_w);
	colonnes_nouv_couleur = Array(rain_w);
	mandatory_print_temp = Array(rain_w);
	mandatory_print_perm = Array(rain_w);
	image_affichee = null;
	cols_stop = Array(rain_w);
	for (let x = 0; x < rain_w; x++) {
		matrix[x] = Array(rain_h);
		refresh_indices[x] = Math.floor(Math.random() * rain_h);
		refresh_rates[x] = 20 + Math.floor(500*Math.random());
		last_paint_cols[x] = now;
		colonnes_nouv_couleur[x] = couleur_defaut;
		mandatory_print_temp[x] = Array(rain_h);
		mandatory_print_perm[x] = Array(rain_h);
		cols_stop[x] = false;
		for (let y = 0; y < rain_h; y++) {
			matrix[x][y] = new Char(rdmChar(), now, [0, 255, 0], MSG_DUREE_COURTE);
			mandatory_print_temp[x][y] = null;
			mandatory_print_perm[x][y] = null;
		}
	}
	
	// Lancer le dessin
	
	canvas = document.getElementById('ecran');
	
	w = cw * rain_w;
	h = ch * rain_h;
	
	canvas.setAttribute("width", w + "px");
	canvas.setAttribute("height", h + "px");
	
	ctx = canvas.getContext('2d');
	
	ctx.font = ch + "px Consolas";
	/*
	var font = new FontFace("Noto", "./police.ttf");
	font.load().then(function (font) {
		document.fonts.add(font);
		ctx.font = "20px Noto";
	});
	//ctx.font = "20px Noto";
	*/
	// Start the first frame request
	
	last_paint = Date.now();
	
	window.requestAnimationFrame(gameLoop);
	
	window.setInterval(update, 1);
	
	let inp = document.getElementById("entree");
	
	inp.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			commande(inp.value);
			inp.value = '';
		}
	});
}

function couleurAttenuer() {
	couleur_defaut = [0,50,0];
	clr_blink = '#2b2b2b';
}

function couleurNormale() {
	couleur_defaut = [0,255,0];
	clr_blink = 'white';
}

function arreter() {
	stop_rain = true;
}

function reprendre() {
	stop_rain = false;
}

function commande(cmd) {
	if (cmd == 'infecter') {
		couleur_defaut = [255, 0, 0];
	} else if (cmd == 'cacher') {
		cacherImage();
	} else if (cmd == 'arreter') {
		arreter();
	} else if (cmd == 'reprendre') {
		reprendre();
	} else if (cmd == 'couleurAttenuer') {
		couleurAttenuer();
	} else if (cmd == 'cacher') {
		cacherImage();
	} else if (cmd == 'prenom') {
		demanderPrenom();
	} else if (cmd == 'aide0') {
		textePersistant("Consulte le journal de bord\ndu capitaine.\nDans le désordre si\ntu veux.\n(sauf pour le Jour5)",3,3);
	} else if (cmd == 'intro') {
		afficherImage('intro.png');
		//textePersistant("Introduction",0,1);
	} else if (cmd == 'jour1') {
		// textePersistant("Jour 1 :\nSystème décimal\net système binaire",0,1);
		//couleurAttenuer();
		afficherImage('jour1.png');
	} else if (cmd == 'jour2') {
		// textePersistant("Jour 2 :\nDécomposer un nombre décimal",0,1);
		//couleurAttenuer();
		afficherImage('jour2.png');
	} else if (cmd == 'jour3') {
		// textePersistant("Jour 3 :\nConvertir un nombre décimal en nombre binaire",0,1);
		//couleurAttenuer();
		afficherImage('jour3.png');
	} else if (cmd == 'tableaudeconversionde12') {
		// textePersistant("Tableau de conversion du nombre décimal 12",0,1);
		//couleurAttenuer();
		afficherImage('tableaudeconversionde12.png');
	} else if (cmd == 'jour4') {
		// textePersistant("Jour 4 :\nConvertir un nombre binaire en nombre décimal",0,1);
		//couleurAttenuer();
		afficherImage('jour4.png');
	} else if (cmd == 'jour5') {
		// textePersistant("Jour 5 :\nAffichage d'un octet",0,1);
		//couleurAttenuer();
		afficherImage('jour5.png');
	} else if (cmd == 'jour6') {
		// textePersistant("Jour 6 :\nGrandeur quotient",0,1);
		//couleurAttenuer();
		afficherImage('jour6.png');
	} else if (cmd == 'pb1') {
		// textePersistant("Une base, dans un système de numération positionnel, est le nombre de symboles (de chiffres) qui sont utilisés pour représenter les nombres.",0,1);
	} else if (cmd == 'pb2') {
		// textePersistant("Puissances d'exposants positifs",0,1);
		afficherImage('pb2.png');
	} else if (cmd == 'pb3') {
		// textePersistant("Puissances d'exposants positifs",0,1);
		afficherImage('pb3.png');
	} else if (cmd == 'pb4') {
		// textePersistant("Tableau de correspondance entre puissance de 10 et mesures en octets",0,1);
		afficherImage('pb4.png');
	} else if (cmd == 'pb5') {
		// textePersistant("Un nombre décimal est un nombre qui s’écrit avec nombre fini de chiffres apr`es la virgule en  ́ecriture d ́ecimale positionnelle. Les nombres décimaux sont les quotients d’entiers par les puissances de 10.",0,1);
	} 			
}


let prenom;

function demanderPrenom() {
	let tempPrenom = prompt("Entrez votre prénom :");
	prenom = tempPrenom;

	// Vérifie si l'utilisateur a saisi quelque chose dans la boîte de dialogue
	if (prenom !== null) {
	    alert("Bonjour, " + prenom + "!"); // Affiche un message de salutation avec le prénom saisi
	    return prenom; // Retourne le prénom saisi
	} else {
	    alert("Vous n'avez rien saisi."); // Si l'utilisateur a annulé, affiche un message d'avertissement
	    return null; // Retourne null si l'utilisateur a annulé
	}
}



// Permet de modifier légèrement une couleur (pour rendre un peu plus évident un message caché par exemple)
function shiftColor(color, shift_ratio) {
	
	hsl = rgbToHsl(color[0], color[1], color[2]);
	rgb = hslToRgb((hsl[0] + shift_ratio) % 1, hsl[1], hsl[2]);
	
	return rgb;
}

function update() {
	let now = Date.now();
	
	for (let x = 0; x < rain_w; x++) {
		if (now - last_paint_cols[x] >= refresh_rates[x]) {
			last_paint_cols[x] = now;
			
			// S'il faut arrêter le rafraîchissement des caractères aléatoires (en bas) ou le reprendre (en haut).
			if (refresh_indices[x] == rain_h - 1 && stop_rain) {
				cols_stop[x] = true;
			} else if (refresh_indices[x] == 0 && !stop_rain) {
				cols_stop[x] = false;
			}
			
			// Une chance sur 8 que la colonne accepte la nouvelle couleur
			if (Math.random() < .125) {
				colonnes_nouv_couleur[x] = couleur_defaut;
			}
			
			// Si aucun caractère n'a la priorité d'affichage (e.g. pour msgs cachés, persistants ou non)
			let newchar;
			let newcol;
			let lifespan;
			if (mandatory_print_perm[x][refresh_indices[x]] != null) {
				newchar = mandatory_print_perm[x][refresh_indices[x]];
				newcol = shiftColor(colonnes_nouv_couleur[x], .15);
				lifespan = MSG_DUREE_LONGUE;
				matrix[x][refresh_indices[x]] = new Char(newchar, now, newcol, lifespan);
			} else if (!cols_stop[x]) {
				if (mandatory_print_temp[x][refresh_indices[x]] != null) {
					newchar = mandatory_print_temp[x][refresh_indices[x]];
					newcol = shiftColor(colonnes_nouv_couleur[x], -.1);
					lifespan = MSG_DUREE_COURTE;
				} else {
					newchar = rdmChar();
					newcol = colonnes_nouv_couleur[x];
					lifespan = MSG_DUREE_COURTE;
				}
				matrix[x][refresh_indices[x]] = new Char(newchar, now, newcol, lifespan);
			}
			
			
			refresh_indices[x] = (refresh_indices[x] + 1) % rain_h;
			// Quand le caractère d'en dessous est peint, il y a une chance sur 100 pour que la fréquence de rafraîchissement change.
			if (Math.random() < .01) {
				refresh_rates[x] = 20 + Math.floor(500*Math.random());
			}
		}
	}
	
}

function gameLoop(timeStamp){
	
	let now = Date.now();
	
	if (now - last_paint >= 1000 / 60) {
		draw();
		last_paint = now;
	}
	
	
	// Keep requesting new frames
	window.requestAnimationFrame(gameLoop);
}


function draw(){
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, w, h);
	
	let now = Date.now();
	
	for (let x = 0; x < rain_w; x++) {
		for (let y = 0; y < rain_h; y++) {
			let c = matrix[x][y];
			let measure = ctx.measureText(c.value);
			//let clocalh = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
			
			
			let lifespan = (now - c.birth) / 1000;
			//if (c.value == '+') {
			//	console.log(c);
			//}
			
			if (lifespan <= .15) {
				ctx.fillStyle = clr_blink;
			} else {
				clr = clrGrad(c.base_color, [0, 0, 0], 1 / (1 + (lifespan/c.lifespan)**2));
				ctx.fillStyle = 'rgb('+clr[0]+','+clr[1]+','+clr[2]+')';
			}
			
			ctx.fillText(c.value, x * cw + cw / 2 - measure.width / 2, y * ch + ch);
		}
	}
	if (image_affichee != null) {
		ctx.drawImage(image_affichee, w / 2 - image_affichee.width / 2, h / 2 - image_affichee.height / 2);
	}
	
}

function messageVerticalCache(texte) {
	// <texte> doit comprendre au plus autant de caractères que comprend une colonne.
	let col = Math.floor(Math.random() * rain_w);
	let beg_row = Math.floor(Math.random() * (rain_h - texte.length));
	for (let y = 0; y < texte.length; y++) {
		mandatory_print_temp[col][beg_row + y] = texte.charAt(y);
	}
}



function lignePersistante(texte, x, y) {
	// <texte> doit être suffisament court pour ne pas dépasser de la ligne <y> en commencant son affiche à la colonne <x>.
	for (let i = 0; i < texte.length; i++) {
		mandatory_print_perm[x + i][y] = texte.charAt(i);
	}
}

// Implémentation plus approfondie de la fonctionnalité proposée par la fonction lignePersistante. Permet ce casser le texte à l'aide de \n et donc d'afficher un bloc de texte.
function textePersistant(texte, x, y) {
	// (<x>,<y>) : coordonnées du top-left corner du bloc de texte.
	// Les \n dans <texte> encodent un renvoi à la ligne. Ils n'encodent pas de caractère.
	let lignes = texte.split('\n');
	for (let l = 0; l < lignes.length; l++) {
		for (let li = 0; li < lignes[l].length; li++) {
			mandatory_print_perm[x + li][y + l] = lignes[l].charAt(li);
		}
	}
}

function textePersistant2(texte, x, y) {
    let lignes = texte.split('\n');

    for (let l = 0; l < lignes.length; l++) {
        let ligneActuelle = lignes[l];
        
        for (let li = 0; li < ligneActuelle.length; li++) {
            if (mandatory_print_perm[x + li] === undefined) {
                mandatory_print_perm[x + li] = [];
            }

            mandatory_print_perm[x + li][y + l] = ligneActuelle.charAt(li);
        }
    }
}



function afficherImage(imgsrc) {
	const img = new Image(); // Create new img element
	img.addEventListener(
		"load",
		() => {
			image_affichee = img;
		},
		false,
	);
	img.src = "./res/" + imgsrc;
}

function cacherImage() {
	image_affichee = null;
}