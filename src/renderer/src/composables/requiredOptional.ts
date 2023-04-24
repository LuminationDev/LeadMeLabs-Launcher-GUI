export function useOptionalValidations(): any {
    const requiredOptional = (): boolean => true

    const testIfWouldPassRequired = (value): boolean => {
        if (Array.isArray(value)) return !!value.length
        if (value === undefined || value === null) {
            return false
        }

        if (Number.isNaN(value)) {
            return false
        }

        if (value === false) {
            return true
        }

        if (value instanceof Date) {
            // invalid date won't pass
            return !isNaN(value.getTime())
        }

        if (typeof value === 'object') {
            for (const _ in value) return true
            return false
        }

        return !!String(value).length
    }
    return { requiredOptional, testIfWouldPassRequired }
}
