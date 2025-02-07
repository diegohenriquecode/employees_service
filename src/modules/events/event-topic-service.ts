import {BarueriConfig} from '../../config';
import TopicService from '../../utils/topic-service';

export default class EventsTopicService {
    static config(cfg: BarueriConfig) {
        return new EventsTopicService(
            TopicService.config(cfg, cfg.mainTopic, cfg.debug),
            'Barueri',
        );
    }

    async publish(Type: string, Rev: number, Trigger: string, Payload: any, MessageGroupIdPrefix = '', Origin = this.origin) {
        await this.topic.publish(Payload, {
            Subject: Type,
            MessageAttributes: {
                Type: {DataType: 'String', StringValue: Type},
                Rev: {DataType: 'Number', StringValue: Rev.toString()},
                Trigger: {DataType: 'String', StringValue: Trigger},
                Origin: {DataType: 'String', StringValue: Origin},
            },
            MessageGroupId: MessageGroupIdPrefix + Type,
        });
    }

    constructor(
        private topic: TopicService,
        private origin: string,
    ) {}
}
