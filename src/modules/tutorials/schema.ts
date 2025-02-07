export type TutorialProps = {
    disabled: boolean,
    title: string,
    tags: string[],
    thumbnail: string,
    roles: string[]
};

export type Tutorial = TutorialProps & {
    id: string,
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
};

export type UpdateTutorialProps = Pick<TutorialProps, 'title' | 'tags' | 'thumbnail' | 'roles'>;
