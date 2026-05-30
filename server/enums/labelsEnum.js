import dayjs from 'dayjs'

export const labelEnum = {
  CURRENT_TIME_STAMP: `${dayjs().format("DD-MMM-YYYY, HH:mm:ss")}`,
  MISSING_EMAIL: 'AuthController::signup'
}
