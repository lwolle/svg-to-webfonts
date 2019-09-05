export const ObjectfromEntries = (entries) => {
    const mapped = entries.map((entry) => (
        {
            [entry[0]]: entry[1],
        }
    ));

    return Object.assign(...mapped);
};
