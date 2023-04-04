import React, {useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

// Components
import {ChatInput} from 'components/ChatInput';
import {RenderChatsAndError} from 'containers/Rhs/views/Prompt/SubComponents/RenderChatsAndError';

// Hooks
import useOpenAIApi from 'hooks/useOpenAIApi';
import useApiRequestCompletionState from 'hooks/useApiRequestCompletionState';

// Actions
import {addChats, setChatPromptPayload} from 'reducers/PromptChat.reducer';

// Selectors
import {getPromptChatSlice} from 'selectors';

// Utils
import {
    checkIfIsImageCommand,
    mapErrorMessageFromOpenAI,
    parseChatCompletionPayload,
    parsePayloadForImageGeneration,
} from 'utils';

// Constants
import {API_SERVICE_CONFIG} from 'constants/apiServiceConfig';
import {ChatCompletionApi, CHAT_API_ROLES} from 'constants/common';

// Styles
import {Container, ChatArea} from './Prompt.styles';

/**
 * Prompt View
 *
 * @example correct usage
 * ```tsx
 * <Prompt />
 * ```
 */
export const Prompt = () => {
    // Initialize hooks
    const dispatch = useDispatch();
    const {state, getApiState, makeApiRequestWithCompletionStatus} = useOpenAIApi();
    const [promptValue, setPromptValue] = useState('');

    // Selectors
    const {chats, payload: chatCompletionsPayload, isChatSummarized} = getPromptChatSlice(state);

    /**
     * The payload needs to be constant till the request cycle to be completed for our custom api to work.
     * We want the payload to change only when the prompt value changes.
     */
    const payload = useMemo(() => {
        if (checkIfIsImageCommand({content: promptValue})) {
            // Before creating the payload we are removing the /image command from the promptValue.
            return parsePayloadForImageGeneration({
                prompt: promptValue.split(/\s+/).slice(1).join(' '),
            });
        }
        return parseChatCompletionPayload({prompt: promptValue, chatHistory: chats});
    }, [promptValue]);

    const {isLoading, error} = getApiState(
        API_SERVICE_CONFIG.getChatCompletion.serviceName,
        chatCompletionsPayload,
    ) as UseApiResponse<ChatCompletionResponseShape>;

    const {isLoading: isImageFromTextLoading, error: imageGenerationError} = getApiState(
        API_SERVICE_CONFIG.getImageFromText.serviceName,
        payload,
    ) as UseApiResponse<ImageGenerationResponseShape>;

    /**
     * On Clicking the send button we are adding the user entered prompt to a state array,
     * and sending request to the open ai servers for the response.
     */
    const handleSend = () => {
        /**
         * If prompt contains / slash commands then image generation endpoint is called.
         */
        if (checkIfIsImageCommand({content: promptValue})) {
            makeApiRequestWithCompletionStatus(
                API_SERVICE_CONFIG.getImageFromText.serviceName,
                payload,
            );
        } else {
            makeApiRequestWithCompletionStatus(
                API_SERVICE_CONFIG.getChatCompletion.serviceName,
                payload,
            );
        }
        dispatch(setChatPromptPayload({payload}));

        dispatch(
            addChats({
                role: CHAT_API_ROLES.user,
                content: promptValue.trim(),
                id: Date.now().toString(),
            }),
        );
    };

    /**
     * Triggers on changing the value in the text area,
     * in `loading` state the user wont be able to change the content in the text area.
     */
    const handleOnChange = (value: string) =>
        !(isLoading || isImageFromTextLoading) && setPromptValue(value);

    /**
     * On getting the success response from the api, we are resetting the text area,
     * and also storing the response in a state array.
     */
    useApiRequestCompletionState({
        serviceName: API_SERVICE_CONFIG.getChatCompletion.serviceName,
        payload,
        handleSuccess: () => setPromptValue(''),
    });

    /**
     * Whenever completions api is successful we are clearing the textarea.
     */
    useApiRequestCompletionState({
        serviceName: API_SERVICE_CONFIG.getChatCompletion.serviceName,
        payload: chatCompletionsPayload,
        handleSuccess: () => setPromptValue(''),
    });

    useApiRequestCompletionState({
        serviceName: API_SERVICE_CONFIG.getImageFromText.serviceName,
        payload,
        handleSuccess: () => setPromptValue(''),
    });

    /**
     * When isChatSummarized is `true`, change the text in textarea to Summarizing...
     */
    useEffect(() => {
        if (isChatSummarized) {
            setPromptValue(ChatCompletionApi.summarizationPrompt);
        }
    }, [isChatSummarized]);

    return (
        <Container>
            <ChatArea>
                <RenderChatsAndError
                    chats={chats}
                    errorMessage={
                        (error && mapErrorMessageFromOpenAI(error)) ||
                        (imageGenerationError && mapErrorMessageFromOpenAI(imageGenerationError))
                    }
                />
            </ChatArea>
            <ChatInput
                value={promptValue}
                isLoading={isLoading || isImageFromTextLoading}
                handleOnChange={handleOnChange}
                handleOnSend={handleSend}
            />
        </Container>
    );
};
