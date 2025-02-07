module.exports = {
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    async scanAll(documents, params) {
        const allItems = [];
        let totalCount = 0;
        do {
            const {Items = [], LastEvaluatedKey, Count = 0} = await documents.scan(params);
            allItems.push(...Items);
            totalCount += Count;
            params.ExclusiveStartKey = LastEvaluatedKey;
        } while (params.ExclusiveStartKey);

        return allItems;
    }
};
