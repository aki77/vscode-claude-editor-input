export interface WebviewMessage {
    command: string;
    [key: string]: any;
}

export interface UserMessage extends WebviewMessage {
    command: 'userQuery';
    text: string;
}

export interface AssistantMessage extends WebviewMessage {
    command: 'assistantMessage';
    text: string;
}

export interface LoadingStateMessage extends WebviewMessage {
    command: 'loadingState';
    loading: boolean;
    message?: string;
}

export interface ErrorMessage extends WebviewMessage {
    command: 'error';
    message: string;
}

export type ChatMessage = UserMessage | AssistantMessage | LoadingStateMessage | ErrorMessage;
