export interface formInputs {
    [key: string]: {
        key: string,
        value: string
    }
}

export interface Parameter {
    id: number,
    key: string,
    value: string,
    keyError: boolean,
    valueError: boolean
}

export interface Validate {
    id: number,
    field: string,
    invalid: boolean
}