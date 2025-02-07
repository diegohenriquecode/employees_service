import {Account} from '../modules/accounts/schema';
import {AppUser} from '../modules/users/schema';

export {};

declare global {

  declare module '*.ejs' {
    const value: string;
    export default value;
  }

  type Nullable<T> = { [K in keyof T]: T[K] | null };
  type EmptyObject = Record<string, never>;
  type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<T>;
  type WithDefaultProps<T> = T & {
    id: string
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
  };

  namespace NodeJS {
    interface ProcessEnv {
      IS_OFFLINE: string | boolean,
      DEBUG: string | boolean;
      INTERNAL_API_KEY: string
      APP_CLIENT_ID: string
    }
  }

  namespace Express {
    export interface Request {
      authorizer?: AuthorizerContext,
    }

    interface Locals {
      user: AppUser,
      account: Account,
      account_id: string,
      rules: any[],
    }
  }
}

// For more info about this file: https://bobbyhadz.com/blog/typescript-process-env-type
