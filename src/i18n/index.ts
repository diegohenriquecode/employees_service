import i18next from 'i18next';

import ptBR from './locales/pt-br.json';

i18next.init({
    fallbackLng: 'ptBR',
    resources: {
        ptBR: {translation: ptBR},
    },
});

export default (lang: string) => i18next.getFixedT(lang);
