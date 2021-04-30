import { BlockAction, ContextMissingPropertyError } from '@slack/bolt';

// TODO: Create a type for our payload once we decide on parameters
export const parseSlackResponse = (response: any) => {
    // console.log(response)
    return 'Jim';
};

export const isButtonSubmit = (payload: BlockAction) => {
    const actions = payload.actions

    for (const action of actions) {
        if (action.type === 'button' && action.action_id === 'record_day') {
            return true
        }
    }

    return false
}