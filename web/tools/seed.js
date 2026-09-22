// Seed contents for the initial (already mined) demo state. Nonce/prev/hash are produced by build.js.
const tx = (amount, from, to) => ({ amount, from, to });
const cb = (to) => ({ amount: '100.00', to });

module.exports = {
  block: [{ number: 1, data: '', linked: false }],
  blockchain: [1, 2, 3, 4, 5].map((n) => ({ number: n, data: '' })),
  distributed: [1, 2, 3, 4, 5].map((n) => ({ number: n, data: '' })),
  // Tokens and Coinbase seed content is copied verbatim from the reference demo's own
  // screenshots (blocks 1-5, both pages) rather than invented. Nonce/prev/hash below are
  // still produced by mining in build.js -- they are not hand-copied -- but should land on
  // the same values shown in the reference demo, which gen-state.js checks.
  tokens: [
    { number: 1, tx: [tx('25.00', 'Darcy', 'Bingley'), tx('4.27', 'Elizabeth', 'Jane'), tx('19.22', 'Wickham', 'Lydia'),
      tx('106.44', 'Lady Catherine de Bourgh', 'Collins'), tx('6.42', 'Charlotte', 'Elizabeth')] },
    { number: 2, tx: [tx('97.67', 'Ripley', 'Lambert'), tx('48.61', 'Kane', 'Ash'), tx('6.15', 'Parker', 'Dallas'),
      tx('10.44', 'Hicks', 'Newt'), tx('88.32', 'Bishop', 'Burke'), tx('45.00', 'Hudson', 'Gorman'), tx('92.00', 'Vasquez', 'Apone')] },
    { number: 3, tx: [tx('10.00', 'Emily', 'Jackson'), tx('5.00', 'Madison', 'Jackson'), tx('20.00', 'Lucas', 'Grace')] },
    { number: 4, tx: [tx('62.19', 'Rick', 'Ilsa'), tx('867.96', 'Captain Louis Renault', 'Strasser'),
      tx('276.15', 'Victor Laszlo', 'Ilsa'), tx('97.13', 'Rick', 'Sam'), tx('119.63', 'Captain Louis Renault', 'Jan Brandel')] },
    { number: 5, tx: [tx('14.12', 'Denise Lovett', 'Edmund Lovett'), tx('2,760.29', 'Lord Glendenning', 'John Moray'),
      tx('413.78', 'Katherine Glendenning', 'Miss Audrey')] }
  ],
  coinbase: [
    { number: 1, coinbase: cb('Anders'), tx: [] },
    { number: 2, coinbase: cb('Anders'), tx: [tx('10.00', 'Anders', 'Sophia'), tx('20.00', 'Anders', 'Lucas'),
      tx('15.00', 'Anders', 'Emily'), tx('15.00', 'Anders', 'Madison')] },
    { number: 3, coinbase: cb('Anders'), tx: [tx('10.00', 'Emily', 'Jackson'), tx('5.00', 'Madison', 'Jackson'), tx('20.00', 'Lucas', 'Grace')] },
    { number: 4, coinbase: cb('Anders'), tx: [tx('15.00', 'Jackson', 'Ryan'), tx('5.00', 'Emily', 'Madison'), tx('8.00', 'Sophia', 'Jackson')] },
    { number: 5, coinbase: cb('Sophia'), tx: [tx('2.00', 'Jackson', 'Alexander'), tx('6.00', 'Ryan', 'Carter'),
      tx('4.00', 'Ryan', 'Riley'), tx('9.95', 'Grace', 'Katherine')] }
  ]
};
