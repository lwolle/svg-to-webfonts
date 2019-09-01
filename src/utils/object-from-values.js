import { ObjectfromEntries } from './object-from-entries';

export const ObjectfromValues = (list1, list2) => {
    const entries = list1.map((item, index) => [item, list2[index]]);

    return ObjectfromEntries(entries);
};
