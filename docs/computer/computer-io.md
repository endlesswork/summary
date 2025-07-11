## 📘 传统 I/O 数据传输流程（以文件发送为例）

![computer-io](/image/computer/computer-io.png)

在传统的 I/O 操作中，数据从磁盘读取并通过网络发送到客户端，通常涉及以下步骤，其中会发生多次上下文切换和数据拷贝：

1.  **应用程序发起读请求 (系统调用):**
    * **用户态 -> 内核态:** 应用程序（例如一个 Web 服务器）通过调用类似 `read()` 这样的系统调用，向操作系统内核发起从磁盘读取文件的请求。这个过程会导致一次从用户态到内核态的上下文切换。

2.  **内核向磁盘控制器发出命令:**
    * 内核接收到请求后，向磁盘控制器硬件发出读取指令。

3.  **DMA (直接内存访问) 控制器将数据从磁盘读取到内核缓冲区:**
    * 磁盘控制器通过 DMA 将数据从磁盘直接读取到内核空间的一个缓冲区（Page Cache 或其他内核缓冲区）中。这个过程**不需要 CPU 的直接参与**。这是**第一次数据拷贝**（硬件到内核内存）。

4.  **数据从内核缓冲区拷贝到用户缓冲区:**
    * **内核态 -> 用户态:** 当 DMA 操作完成后，磁盘控制器会通知 CPU（通常通过中断）。然后，内核将数据从其内核缓冲区拷贝到应用程序在用户空间指定的缓冲区。这是**第二次数据拷贝**。操作系统完成数据拷贝后，`read()` 系统调用返回，此时发生一次从内核态到用户态的上下文切换。

5.  **应用程序发起写请求 (系统调用) 到网络套接字:**
    * **用户态 -> 内核态:** 应用程序现在拥有了数据，它通过调用类似 `send()` 或 `write()` 这样的系统调用，向操作系统的网络协议栈发起将数据发送到客户端的请求。这又导致一次从用户态到内核态的上下文切换。

6.  **数据从用户缓冲区拷贝到内核套接字缓冲区 (Socket Buffer):**
    * 内核接收到发送请求后，将数据从应用程序的用户缓冲区拷贝到内核空间的套接字缓冲区。这是**第三次数据拷贝**。

7.  **DMA (直接内存访问) 控制器将数据从套接字缓冲区发送到网络接口卡 (NIC):**
    * 网络协议栈处理数据（例如添加 TCP/IP 头部信息）后，会将数据交给网络接口卡 (NIC)。NIC 通常也使用 DMA 将数据从内核的套接字缓冲区传输到其自身的发送队列或直接发送出去。这是**第四次数据拷贝**（内核内存到硬件）。这个过程也**不需要 CPU 的直接参与**。

8.  **网络接口卡将数据发送到网络:**
    * NIC 将数据帧通过物理网络发送出去。当数据发送完成后，NIC 可能会通知 CPU（通过中断）。`send()` 系统调用返回，此时可能发生从内核态到用户态的上下文切换（取决于 `send` 是阻塞还是非阻塞的，以及数据是否完全发送完毕）。

### 多次上下文切换

在典型的读写操作中（例如从磁盘读取文件并通过网络发送），通常涉及**至少 4 次**主要的上下文切换：

1.  **`read()` 系统调用时：**
    * 用户态 -> 内核态 (发起读请求)
    * 内核态 -> 用户态 (读操作完成，数据返回用户空间)
2.  **`send()` (或 `write()` 到套接字) 系统调用时：**
    * 用户态 -> 内核态 (发起写请求)
    * 内核态 -> 用户态 (写操作交付给协议栈或完成)

### 多次数据拷贝

在这个经典模型中，数据在从磁盘到网卡的整个过程中，至少被拷贝了**4 次**：

1.  **磁盘 -> 内核缓冲区 (DMA)**:
    * 数据由 DMA 控制器从磁盘直接拷贝到内核空间的页面缓存 (Page Cache) 或其他内核缓冲区。
2.  **内核缓冲区 -> 用户缓冲区 (CPU)**:
    * CPU 将数据从内核缓冲区拷贝到应用程序在用户空间指定的缓冲区。
3.  **用户缓冲区 -> 内核套接字缓冲区 (CPU)**:
    * CPU 将数据从用户缓冲区拷贝到内核空间的套接字缓冲区 (Socket Buffer)。
4.  **内核套接字缓冲区 -> 网络接口卡 (NIC) (DMA)**:
    * 数据由 DMA 控制器从内核套接字缓冲区拷贝到网络接口卡的硬件缓冲区，准备发送。

