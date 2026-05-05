import { Redis } from "@upstash/redis";

export const redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
});

interface ConversationStateData {
    phoneNumber: string;
    threadId: string;
    intent?: string;        // booking, chat, reschedule
    step?: string;          // what step of the flow they're on
    service?: string;       // which service they selected
    date?: string;          // appointment date
    time?: string;          // appointment time
}

class RedisCache {
  constructor() {
    this.saveConversationState = this.saveConversationState.bind(this)
  this.loadConversationState = this.loadConversationState.bind(this)
  this.deleteConversationState = this.deleteConversationState.bind(this)
  }

async  saveConversationState({phoneNumber,threadId,intent,step,service,date,time}:ConversationStateData){
  
   await redisClient.set(`${phoneNumber}_thread_id`,{
    threadId,
    intent,
    step,
    service,
    date,
    time
   }, {ex: 60 * 60 * 24})

  }

  async loadConversationState({phoneNumber}:Partial<ConversationStateData>){  
    return await redisClient.get(`${phoneNumber}_thread_id`)
  }

  async deleteConversationState({phoneNumber}:Partial<ConversationStateData>){  
   return await redisClient.del(`${phoneNumber}_thread_id`)
  }

}





export const {saveConversationState,loadConversationState,deleteConversationState} = new RedisCache();