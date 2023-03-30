import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

// Reducers
import {setApiRequestCompletionState} from 'reducers/apiRequest';

// Services
import pluginApiService from 'services/pluginApiService';

// Constants
import {PLUGIN_ID} from 'constants/common';

function usePluginApi() {
    const state = useSelector((reduxState: ReduxState) => reduxState);
    const dispatch = useDispatch();

    // Pass payload only in POST requests. For GET requests, there is no need to pass a payload argument
    const makeApiRequest = useCallback(
        async (serviceName: ApiServiceName, payload: APIRequestPayload) =>
            dispatch(pluginApiService.endpoints[serviceName].initiate(payload)),
        [dispatch],
    );

    const makeApiRequestWithCompletionStatus = useCallback(
        async (serviceName: ApiServiceName, payload: APIRequestPayload): Promise<void> => {
            await makeApiRequest(serviceName, payload);
            dispatch(setApiRequestCompletionState(serviceName));
        },
        [dispatch],
    );

    // Pass payload only in POST requests. For GET requests, there is no need to pass a payload argument
    const getApiState = useCallback(
        (serviceName: ApiServiceName, payload: APIRequestPayload) => {
            const {data, isError, isLoading, isSuccess, error, isUninitialized} =
                pluginApiService.endpoints[serviceName].select(payload)(state[PLUGIN_ID]);
            return {data, isError, isLoading, isSuccess, error, isUninitialized};
        },
        [state],
    );

    return {makeApiRequest, makeApiRequestWithCompletionStatus, getApiState, state};
}

export default usePluginApi;
