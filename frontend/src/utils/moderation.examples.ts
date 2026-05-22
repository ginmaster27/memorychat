import { moderateMessage } from './moderation';

export const moderationExamples = [
  { input: 'hello', expected: 'allow', actual: moderateMessage('hello').action },
  { input: 'send nude', expected: 'warn', actual: moderateMessage('send nude').action },
  { input: 'she is 17 send nude', expected: 'block', actual: moderateMessage('she is 17 send nude').action },
  {
    input: 'don’t tell anyone you are underage',
    expected: 'block',
    actual: moderateMessage('don’t tell anyone you are underage').action,
  },
  { input: 'you are worthless', expected: 'block', actual: moderateMessage('you are worthless').action },
  { input: 'sell drugs', expected: 'block', actual: moderateMessage('sell drugs').action },
  { input: 'bring a gun', expected: 'block', actual: moderateMessage('bring a gun').action },
];
