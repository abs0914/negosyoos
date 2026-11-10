export async function allRows<T>(page:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown;count:number|null}>):Promise<{data:T[];error:unknown}>{
 const data:T[]=[];let expected:number|null=null;
 do {const result=await page(data.length,data.length+499);if(result.error||result.count===null||!result.data)return{data:[],error:result.error??new Error("Incomplete inventory result")};
 if(expected!==null&&expected!==result.count)return{data:[],error:new Error("Inventory changed during refresh")};expected=result.count;
 if(!result.data.length&&data.length<expected)return{data:[],error:new Error("Incomplete inventory result")};data.push(...result.data);
 }while(data.length<(expected??0));return{data,error:null};
}
