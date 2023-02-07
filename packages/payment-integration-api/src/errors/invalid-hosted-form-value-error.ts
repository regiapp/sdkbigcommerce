import { flatMap, map, values } from 'lodash';

import { HostedInputValidateErrorDataMap } from '../hosted-form';

import StandardError from './standard-error';

export default class InvalidHostedFormValueError extends StandardError {
    constructor(public errors: HostedInputValidateErrorDataMap) {
        super(
            [
                'Unable to proceed due to invalid user input values',
                ...flatMap(values(errors), (fieldErrors) =>
                    map(fieldErrors, ({ message }) => message),
                ),
            ].join('. '),
        );

        this.name = 'InvalidHostedFormValueError';
        this.type = 'invalid_hosted_form_value';
    }
}
