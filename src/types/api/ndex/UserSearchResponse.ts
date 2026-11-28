import { User } from './User'

export interface UserSearchResponse {
  resultList: User[]
  numFound: number
  start: number
}
