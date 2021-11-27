class BadRequestError extends Error{
    constructor(message){
        super(message);
    }
}

class MethodNotAllowedError extends Error{
    constructor(message){
        super(message);
    }
}

class NotFoundError extends Error{
    constructor(message){
        super(message);
    }
}

class UnauthorizedError extends Error{
    constructor(message){
        super(message);
    }
}

export {
    BadRequestError,
    MethodNotAllowedError,
    NotFoundError,
    UnauthorizedError
}