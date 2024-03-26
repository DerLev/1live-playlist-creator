const generateSearchString = (...input: string[]) => {
  const formattedInput = input.map((item) => {
    /* eslint-disable-next-line no-useless-escape */
    return item.replace(/[^a-z0-9\-\s\(\)\.\&]/gi, "")
      .toLowerCase().replace(" feat. ", "|").replace(" x ", "|")
      .replace(" & ", "|").split("|").join();
  });
  return formattedInput.join("|");
};

export default generateSearchString;
