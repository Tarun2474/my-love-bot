export const calculateLevel = (totalChatSeconds: number): number => {
  const minutes = Math.floor(totalChatSeconds / 60);
  const calculatedLevel = Math.floor(minutes / 5);
  return Math.max(1, calculatedLevel);
};
