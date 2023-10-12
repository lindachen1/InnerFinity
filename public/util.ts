type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

const operations: operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update User",
    endpoint: "/api/users",
    method: "PATCH",
    fields: { update: { username: "input", password: "input" } },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Posts (empty for all)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Get Pending Posts",
    endpoint: "/api/pendingPosts",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Accessible Posts",
    endpoint: "/api/accessiblePosts",
    method: "GET",
    fields: {},
  },
  {
    name: "Get Shared Post Resources",
    endpoint: "/api/sharing/posts",
    method: "GET",
    fields: {},
  },
  {
    name: "Create Post (Y/N for allowRequests)",
    endpoint: "/api/posts",
    method: "POST",
    fields: { imageURL: "input", caption: "input", altText: "input", authors: "json", allowRequests: "input", shareWithUsers: "json", shareWithLists: "json" },
  },
  {
    name: "Approve Group Post",
    endpoint: "/api/posts/:id/approve",
    method: "PUT",
    fields: { id: "input" },
  },
  {
    name: "Reject Group Post",
    endpoint: "/api/posts/:id/reject",
    method: "PUT",
    fields: { id: "input" },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Request access to Post",
    endpoint: "/api/sharing/posts/:id/requests",
    method: "POST",
    fields: { id: "input" },
  },
  {
    name: "Add access to Post",
    endpoint: "/api/sharing/posts/:id/members",
    method: "POST",
    fields: { id: "input", user: "input" },
  },
  {
    name: "Remove access to Post",
    endpoint: "/api/sharing/posts/:id/members",
    method: "DELETE",
    fields: { id: "input", user: "input" },
  },
  {
    name: "Add list access to Post",
    endpoint: "/api/sharing/posts/:id/lists",
    method: "POST",
    fields: { id: "input", list: "input" },
  },
  {
    name: "Remove list access to Post",
    endpoint: "/api/sharing/posts/:id/lists",
    method: "DELETE",
    fields: { id: "input", list: "input" },
  },
  {
    name: "Get Shared Comment Resources",
    endpoint: "/api/sharing/comments",
    method: "GET",
    fields: {},
  },
  {
    name: "Create comment",
    endpoint: "/api/posts/:id/comments",
    method: "POST",
    fields: { id: "input", content: "input", shareWithUsers: "json", shareWithLists: "json" },
  },
  {
    name: "Get comments by Post ID",
    endpoint: "/api/posts/:id/comments",
    method: "GET",
    fields: { id: "input" },
  },
  {
    name: "Delete comment",
    endpoint: "/api/comments/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get User List",
    endpoint: "/api/userLists",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User List",
    endpoint: "/api/userLists",
    method: "POST",
    fields: { name: "input", members: "json" },
  },
  {
    name: "Edit User List Name",
    endpoint: "/api/userLists/:id",
    method: "PATCH",
    fields: { id: "input", name: "input" },
  },
  {
    name: "Add to User List",
    endpoint: "/api/userLists/:id/members",
    method: "POST",
    fields: { id: "input", user: "input" },
  },
  {
    name: "Remove from User List",
    endpoint: "/api/userLists/:id/members",
    method: "DELETE",
    fields: { id: "input", user: "input" },
  },
  {
    name: "Delete User List",
    endpoint: "/api/userLists/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get friends",
    endpoint: "/api/friends",
    method: "GET",
    fields: {},
  },
  {
    name: "Delete friends",
    endpoint: "/api/friends/:friend",
    method: "DELETE",
    fields: { friend: "input" },
  },
  {
    name: "Get friend requests",
    endpoint: "/api/friend/requests",
    method: "GET",
    fields: {},
  },
  {
    name: "Send friend request",
    endpoint: "/api/friend/requests/:to",
    method: "POST",
    fields: { to: "input" },
  },
  {
    name: "Remove friend request",
    endpoint: "/api/friend/requests/:to",
    method: "DELETE",
    fields: { to: "input" },
  },
  {
    name: "Accept friend request",
    endpoint: "/api/friend/accept/:from",
    method: "PUT",
    fields: { from: "input" },
  },
  {
    name: "Reject friend request",
    endpoint: "/api/friend/reject/:from",
    method: "PUT",
    fields: { from: "input" },
  },
];

// Do not edit below here.
// If you are interested in how this works, feel free to ask on forum!

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (!value) {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
