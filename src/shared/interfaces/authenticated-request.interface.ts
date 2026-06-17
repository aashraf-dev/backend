import { Request } from 'express';
import { IJwtPayload } from './jwt-payload.interface';

export interface IAuthenticatedRequest extends Request {
  user: IJwtPayload;
}
