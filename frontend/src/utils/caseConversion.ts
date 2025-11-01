const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const transformKeys = <T extends Record<string, any>>(obj: T): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const newKey = toCamelCase(key);
      newObj[newKey] = transformKeys(obj[key]);
    });
    return newObj;
  }
  return obj;
};

export const convertSnakeToCamel = <T>(data: T): T => {
  return transformKeys(data as any) as T;
};