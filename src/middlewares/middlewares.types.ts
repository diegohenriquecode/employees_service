import {NextFunction, Request, Response} from 'express';

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type ExpressParamCallback = (req: Request, res: Response, next: NextFunction, val: any, param: string) => void;
