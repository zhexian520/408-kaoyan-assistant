export interface CourseCodeSnippet {
  language: string;
  description: string;
  code: string;
}

const SNIPPETS: Array<{ match: RegExp; snippet: CourseCodeSnippet }> = [
  {
    match: /顺序表|线性表|有序表|插入|删除/,
    snippet: {
      language: "c",
      description: "顺序表插入与删除（C 语言）",
      code: `#define MAXSIZE 100
typedef struct {
    int data[MAXSIZE];
    int length;
} SqList;

// 在第 i 个位置插入 e，合法范围 1..length+1
bool ListInsert(SqList *L, int i, int e) {
    if (i < 1 || i > L->length + 1) return false;
    if (L->length >= MAXSIZE) return false;
    for (int j = L->length; j >= i; j--)
        L->data[j] = L->data[j - 1];   // 后移
    L->data[i - 1] = e;
    L->length++;
    return true;
}

// 删除第 i 个元素，并用 e 返回
bool ListDelete(SqList *L, int i, int *e) {
    if (i < 1 || i > L->length) return false;
    *e = L->data[i - 1];
    for (int j = i; j < L->length; j++)
        L->data[j - 1] = L->data[j];   // 前移
    L->length--;
    return true;
}`,
    },
  },
  {
    match: /链表|单链|双链|指针/,
    snippet: {
      language: "c",
      description: "单链表按位序插入（C 语言）",
      code: `typedef struct LNode {
    int data;
    struct LNode *next;
} LNode, *LinkList;

// 在第 i 个位置插入 e，带头结点
bool ListInsert(LinkList L, int i, int e) {
    if (i < 1) return false;
    LNode *p = L;
    int j = 0;
    while (p != NULL && j < i - 1) {
        p = p->next;
        j++;
    }
    if (p == NULL) return false;
    LNode *s = (LNode *)malloc(sizeof(LNode));
    s->data = e;
    s->next = p->next;
    p->next = s;
    return true;
}`,
    },
  },
  {
    match: /栈/,
    snippet: {
      language: "c",
      description: "顺序栈入栈与出栈（C 语言）",
      code: `#define MAXSIZE 100
typedef struct {
    int data[MAXSIZE];
    int top;
} SqStack;

void InitStack(SqStack *S) { S->top = -1; }

bool Push(SqStack *S, int x) {
    if (S->top == MAXSIZE - 1) return false;
    S->data[++S->top] = x;
    return true;
}

bool Pop(SqStack *S, int *x) {
    if (S->top == -1) return false;
    *x = S->data[S->top--];
    return true;
}`,
    },
  },
  {
    match: /队列/,
    snippet: {
      language: "c",
      description: "循环队列入队与出队（C 语言）",
      code: `#define MAXSIZE 100
typedef struct {
    int data[MAXSIZE];
    int front, rear;
} SqQueue;

void InitQueue(SqQueue *Q) { Q->front = Q->rear = 0; }

bool EnQueue(SqQueue *Q, int x) {
    if ((Q->rear + 1) % MAXSIZE == Q->front) return false;
    Q->data[Q->rear] = x;
    Q->rear = (Q->rear + 1) % MAXSIZE;
    return true;
}

bool DeQueue(SqQueue *Q, int *x) {
    if (Q->front == Q->rear) return false;
    *x = Q->data[Q->front];
    Q->front = (Q->front + 1) % MAXSIZE;
    return true;
}`,
    },
  },
  {
    match: /树|二叉|遍历|哈夫曼|平衡/,
    snippet: {
      language: "c",
      description: "二叉树中序遍历与层次遍历（C 语言）",
      code: `typedef struct BiTNode {
    int data;
    struct BiTNode *lchild, *rchild;
} BiTNode, *BiTree;

void InOrder(BiTree T) {
    if (T == NULL) return;
    InOrder(T->lchild);
    visit(T);
    InOrder(T->rchild);
}

// 层次遍历需要队列
void LevelOrder(BiTree T) {
    InitQueue(&Q);
    if (T != NULL) EnQueue(&Q, T);
    while (!IsEmpty(Q)) {
        BiTNode *p;
        DeQueue(&Q, &p);
        visit(p);
        if (p->lchild) EnQueue(&Q, p->lchild);
        if (p->rchild) EnQueue(&Q, p->rchild);
    }
}`,
    },
  },
  {
    match: /图|最短路径|拓扑|生成树/,
    snippet: {
      language: "c",
      description: "图的 BFS 与 Dijkstra 核心框架（C 语言）",
      code: `void BFS(Graph G, int v) {
    visit(v);
    visited[v] = true;
    InitQueue(&Q);
    EnQueue(&Q, v);
    while (!IsEmpty(Q)) {
        DeQueue(&Q, &v);
        for (int w = FirstNeighbor(G, v); w >= 0; w = NextNeighbor(G, v, w)) {
            if (!visited[w]) {
                visit(w);
                visited[w] = true;
                EnQueue(&Q, w);
            }
        }
    }
}

// Dijkstra：dist[] 保存源点到各点最短距离
void Dijkstra(Graph G, int src, int dist[]) {
    for (int i = 0; i < G.vexnum; i++) {
        dist[i] = INF;
        visited[i] = false;
    }
    dist[src] = 0;
    for (int i = 0; i < G.vexnum; i++) {
        int u = -1, min = INF;
        for (int j = 0; j < G.vexnum; j++)
            if (!visited[j] && dist[j] < min) { u = j; min = dist[j]; }
        if (u == -1) break;
        visited[u] = true;
        for (int v = 0; v < G.vexnum; v++)
            if (!visited[v] && dist[u] + G.edge[u][v] < dist[v])
                dist[v] = dist[u] + G.edge[u][v];
    }
}`,
    },
  },
  {
    match: /排序|查找/,
    snippet: {
      language: "c",
      description: "快速排序与折半查找（C 语言）",
      code: `int Partition(int A[], int low, int high) {
    int pivot = A[low];
    while (low < high) {
        while (low < high && A[high] >= pivot) high--;
        A[low] = A[high];
        while (low < high && A[low] <= pivot) low++;
        A[high] = A[low];
    }
    A[low] = pivot;
    return low;
}

void QuickSort(int A[], int low, int high) {
    if (low < high) {
        int pivotPos = Partition(A, low, high);
        QuickSort(A, low, pivotPos - 1);
        QuickSort(A, pivotPos + 1, high);
    }
}

int BinarySearch(int A[], int n, int key) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (A[mid] == key) return mid;
        else if (A[mid] < key) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
    },
  },
  {
    match: /进程|线程|同步|互斥|PV/,
    snippet: {
      language: "c",
      description: "PV 操作与生产者-消费者伪代码",
      code: `semaphore mutex = 1;   // 互斥访问缓冲区
semaphore empty = n;   // 空闲缓冲区数量
semaphore full = 0;    // 已放入产品数量

// 生产者
void Producer() {
    while (true) {
        produce_item();
        P(empty);
        P(mutex);
        put_item();
        V(mutex);
        V(full);
    }
}

// 消费者
void Consumer() {
    while (true) {
        P(full);
        P(mutex);
        take_item();
        V(mutex);
        V(empty);
        consume_item();
    }
}`,
    },
  },
  {
    match: /页|分页|虚拟内存|置换/,
    snippet: {
      language: "c",
      description: "LRU 页面置换核心逻辑（C 语言）",
      code: `// frames[] 保存内存中的页号，time[] 保存最近访问时间
int LRU(int pages[], int n, int capacity) {
    int frames[capacity], time[capacity];
    int faults = 0, clock = 0;
    for (int i = 0; i < capacity; i++) { frames[i] = -1; time[i] = 0; }

    for (int i = 0; i < n; i++) {
        int page = pages[i], hit = -1;
        for (int j = 0; j < capacity; j++)
            if (frames[j] == page) { hit = j; break; }

        if (hit != -1) {
            time[hit] = ++clock;   // 命中，刷新访问时间
        } else {
            faults++;
            int victim = 0;
            for (int j = 1; j < capacity; j++)
                if (time[j] < time[victim]) victim = j;
            frames[victim] = page;
            time[victim] = ++clock;
        }
    }
    return faults;
}`,
    },
  },
  {
    match: /TCP|握手|拥塞|传输层/,
    snippet: {
      language: "c",
      description: "TCP 三次握手与拥塞窗口伪代码",
      code: `// 客户端
send(SYN, seq = x);
recv(SYN + ACK, seq = y, ack = x + 1);
send(ACK, seq = x + 1, ack = y + 1);
state = ESTABLISHED;

// 服务器
recv(SYN, seq = x);
send(SYN + ACK, seq = y, ack = x + 1);
recv(ACK, seq = x + 1, ack = y + 1);
state = ESTABLISHED;

// 慢开始 + 拥塞避免
cwnd = 1;
while (connection_alive) {
    if (timeout) {
        ssthresh = cwnd / 2;
        cwnd = 1;              // 重新慢开始
    } else {
        if (cwnd < ssthresh) cwnd *= 2;   // 指数增长
        else cwnd += 1;                    // 线性增长
    }
}`,
    },
  },
];

export function getFallbackCourseCode(
  sectionTitle: string,
  subjectCode: string
): CourseCodeSnippet | null {
  const text = `${sectionTitle} ${subjectCode}`;
  for (const item of SNIPPETS) {
    if (item.match.test(text)) return item.snippet;
  }
  return null;
}
