var e = {
  added: (e) => `Added to calculator: ${e}.`,
  tableAdded: (e, t) =>
    `Added table to calculator: ${[...e, `${t} ${t === 1 ? `row` : `rows`}`].join(`, `)}.`,
  pairAppended: (e, t, n) => `Added to table ${e}, ${t}, row ${n}.`,
  alreadyPresent: (e) => `Already in the calculator, row ${e}.`,
  renamed: (e, t) => `Added as ${e} because ${t} is already defined.`,
  rejected: `This can't be added to the calculator.`,
  unavailableRetry: `Calculator unavailable. Use Retry in the calculator panel.`,
  unavailableReload: `Calculator unavailable. Reload the page to use it.`,
  tooManyWaiting: `Too many transfers are waiting. Try again when the calculator has opened.`,
};
export { e as t };
