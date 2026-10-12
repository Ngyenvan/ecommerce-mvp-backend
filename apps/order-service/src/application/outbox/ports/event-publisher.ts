export abstract class EventPublisher {
  abstract publish(topic: string, key: string, payload: unknown): Promise<void>;
}
