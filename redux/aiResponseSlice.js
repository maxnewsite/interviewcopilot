import { createSlice } from '@reduxjs/toolkit';

const aiResponseSlice = createSlice({
  name: 'aiResponse',
  initialState: '',
  reducers: {
    setAIResponse: (state, action) => action.payload,
  },
});

export const { setAIResponse } = aiResponseSlice.actions;
export default aiResponseSlice.reducer;
