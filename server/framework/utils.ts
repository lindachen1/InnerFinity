import { ObjectId } from "mongodb";

export function getParamNames(f: Function) {
  return f
    .toString()
    .match(/\((.*?)\)/)![1]
    .split(",") // Simple regex to get "name: type" items in signature
    .map((param: string) => param.split("=")[0].trim()); // remove whitespaces
}

export function includes(array: ObjectId[], element: ObjectId) {
  return array.map((x) => x.toString()).includes(element.toString());
}
