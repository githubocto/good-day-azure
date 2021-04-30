import { BlockAction, ContextMissingPropertyError } from '@slack/bolt';

// TODO: Create a type for our payload once we decide on parameters
export const parseSlackResponse = (payload: BlockAction, newFile = false) => {
    const options = slackOptions(payload)
    const state = payload.view.state.values

    let parsedResponseHeader = ``
    let parsedResponseBody = ``
    for (const val of Object.values(state)) {
        const userSelectedOptionName = Object.keys(val)[0]

        const userSelectedOption = val[userSelectedOptionName].selected_option?.value ? val[userSelectedOptionName].selected_option.value : ''
        const option = options[`${userSelectedOptionName}_block`].find(o => o.value === userSelectedOption);
        const optionText = option?.text?.text ? option.text.text : 'N/A'
        
        parsedResponseHeader += userSelectedOptionName + ','
        parsedResponseBody += optionText + ','
    }

    if (newFile) {
        return parsedResponseHeader + '\n' + parsedResponseBody
    }

    return parsedResponseBody;
};

const slackOptions = (payload: BlockAction) => {
    const blocks = payload.view.blocks

    const options = {}

    for (const val of Object.values(blocks)) {
        if (val.accessory?.type === 'static_select') {
            const id = val.block_id
            options[id] = val.accessory.options
        } 
    }
    
    return options
}

export const isButtonSubmit = (payload: BlockAction) => {
    const actions = payload.actions

    for (const action of actions) {
        if (action.type === 'button' && action.action_id === 'record_day') {
            return true
        }
    }

    return false
}