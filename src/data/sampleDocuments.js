// High-yield CSE study texts with rich technical concepts, diagrams, and checkpoint questions

export const SAMPLE_DOCUMENTS = [
  {
    id: "raft-consensus",
    title: "Distributed Systems: Raft Consensus Algorithm & Leader Election",
    category: "Distributed Systems / CSE 442",
    description: "Understand state machine replication, leader election heartbeats, randomized split-vote timers, and log entry replication consistency.",
    content: `# Distributed Systems: Raft Consensus Algorithm & Leader Election

## 1. Introduction to Consensus & State Machine Replication
Distributed consensus is the fundamental problem of getting multiple independent, failure-prone servers to agree on a sequence of state transitions. In State Machine Replication (SMR), identical deterministic state machines are executed in the same order across a cluster of replicas. If all non-faulty nodes process the identical sequence of log entries, their final internal states will remain bit-for-bit identical.

Earlier systems utilized Paxos, notorious for its conceptual opacity and difficult implementation semantics. Raft was explicitly designed by Diego Ongaro and John Ousterhout at Stanford with an emphasis on **understandability**. Raft decomposes consensus into three independent subproblems:
1. **Leader Election**: Selecting a single authoritative leader when an existing leader crashes or during system initialization.
2. **Log Replication**: The leader accepts log entries from clients and forces all followers to duplicate its sequence faithfully.
3. **Safety**: Guaranteeing that if any server has applied a particular log entry at an index to its state machine, no other server will ever apply a different entry for that same index.

---

## 2. Server Roles and Term Epochs
At any given moment, every server in a Raft cluster exists in exactly one of three states:
- **Leader**: Handles all client requests, dictates log sequence order, and dispatches periodic heartbeats to maintain authority.
- **Follower**: Completely passive; does not issue requests independently but responds only to incoming Remote Procedure Calls (RPCs) from leaders and candidates.
- **Candidate**: A transitional state assumed by a follower when its election timer expires without receiving leader heartbeats.

Raft divides time into arbitrary **Terms**, which act as a logical clock. Terms are consecutive integers numbered starting at 1. Each term begins with an election in which one or more candidates attempt to win the majority vote. If a candidate wins, it rules as leader for the remainder of the term. If split-votes occur, the term ends with no leader, and a new term begins immediately. Crucially, each server stores its current term number persistently; if a leader discovers a higher term number on another node, it immediately reverts to follower status.

---

## 3. The Election Mechanism & Randomized Election Timers
Followers detect leader failure through an **election timeout**. If a follower receives no AppendEntries RPC (heartbeat) within this interval, it assumes the leader is dead and transitions to Candidate.

Upon becoming a candidate, a server:
1. Increments its current term (\`currentTerm++\`).
2. Votes for itself.
3. Resets its election timer.
4. Dispatches \`RequestVote\` RPCs in parallel to all other servers in the cluster.

A candidate wins the election if it secures votes from a strict majority (\`N/2 + 1\`) of the servers in the cluster. Each server votes on a first-come, first-served basis, and can vote for at most one candidate per term.

### The Split-Vote Dilemma
If multiple followers time out simultaneously, votes can split evenly, preventing any candidate from securing a majority. Raft elegantly resolves this through **randomized election timeouts**. Election timeouts are chosen randomly from a fixed range (typically 150ms–300ms). This randomization spreads out the timeouts so that in almost all cases, a single server will time out first, win the election, and establish heartbeats before its peers can time out.

---

## 4. Log Replication and Consistency Check
Once a leader is elected, it begins serving client commands. Each client command contains an operation to be executed by the replicated state machines.

The replication lifecycle progresses as follows:
1. **Append to Leader Log**: The leader appends the command to its local log as a new entry containing an integer index, the term when received, and the command.
2. **Dispatch AppendEntries RPC**: The leader sends an \`AppendEntries\` RPC containing the new entry to all followers.
3. **Commit Index Advance**: When the entry has been safely replicated across a majority of servers, the leader considers the entry **committed**.
4. **Apply to State Machine**: The leader applies the committed entry to its local state machine and returns the execution result to the client.
5. **Follower Notification**: Future heartbeats notify followers of the updated \`commitIndex\`, prompting them to apply the entries locally.

### The Log Matching Property
Raft enforces a strict invariant called the **Log Matching Property**:
- If two entries in different logs have the same index and term, then they store the same command.
- If two entries in different logs have the same index and term, then their logs are identical in all preceding entries.

When dispatching an \`AppendEntries\` RPC, the leader includes the index and term of the entry immediately preceding the new entries (\`prevLogIndex\`, \`prevLogTerm\`). If the follower does not find a matching entry in its log, it rejects the RPC. The leader then decrements \`nextIndex\` for that follower and retries until a matching point is found, overwriting any conflicting follower entries.

---

## 5. Election Restriction and Safety Invariants
In many consensus algorithms, any node can become leader and subsequently back-fill missing log entries. Raft uses a much simpler design: it guarantees that log entries only flow in one direction—from leader to follower. A leader never overwrites or truncates its own log entries.

To support this rule without losing committed entries, Raft enforces the **Election Restriction**:
A follower will deny its vote in a \`RequestVote\` RPC unless the candidate's log is at least as up-to-date as the follower's own log.

Up-to-dateness is determined by comparing the last entries of the two logs:
1. If the logs end with different terms, the log with the higher term is considered more up-to-date.
2. If the logs end with the same term, whichever log is longer (has a higher index) is more up-to-date.

Because a committed entry must be present on a majority of servers, and a candidate must receive votes from a majority of servers, any voting majority must overlap with the replication majority by at least one server. That overlapping server will refuse its vote to any candidate missing the committed entry, mathematically proving that no server can become leader without possessing all committed entries.`,
    preloadedCheckpoints: [
      {
        chunkIndex: 0,
        question: "What is the primary motivation behind Raft's design compared to Multi-Paxos?",
        options: [
          "Raft was designed primarily for understandability and clear problem decomposition",
          "Raft achieves sub-millisecond network round trips using UDP",
          "Raft eliminates the need for majority quorums in cluster elections",
          "Raft allows multiple leaders to write concurrently to different partitions"
        ],
        correctIndex: 0,
        explanation: "Raft was created by Ongaro and Ousterhout with an explicit focus on understandability, decomposing consensus into Leader Election, Log Replication, and Safety."
      },
      {
        chunkIndex: 2,
        question: "How does Raft avoid perpetual split-vote stalemates during leader elections?",
        options: [
          "By employing randomized election timeouts (e.g. 150ms-300ms)",
          "By selecting the node with the lowest IP address as dictator",
          "By falling back to a centralized ZooKeeper coordinator",
          "By doubling the term number every 10 milliseconds"
        ],
        correctIndex: 0,
        explanation: "Randomized election timeouts (150-300ms) stagger the timeouts so one candidate almost always times out first, gathers a majority, and asserts leadership before others."
      },
      {
        chunkIndex: 4,
        question: "What is the condition for a Raft follower to grant its vote to a candidate in RequestVote RPC?",
        options: [
          "The candidate's log must be at least as up-to-date as the follower's own log",
          "The candidate must have completed a write operation in the last second",
          "The candidate must be located in the primary availability zone",
          "The candidate must have processed fewer total terms than the cluster average"
        ],
        correctIndex: 0,
        explanation: "The Election Restriction mandates that a candidate's log must be at least as up-to-date (higher last term, or longer log if terms match) to ensure it holds all committed entries."
      }
    ]
  },
  {
    id: "virtual-memory-paging",
    title: "Operating Systems: Virtual Memory, Paging & TLB Miss Handling",
    category: "Systems Architecture / CSE 351",
    description: "Multi-level page tables, virtual address translation, Translation Lookaside Buffer (TLB) hits/misses, and page fault replacement algorithms.",
    content: `# Operating Systems: Virtual Memory, Paging & TLB Miss Handling

## 1. Motivations for Virtual Memory
Modern multitasking operating systems run dozens of processes concurrently, yet physical memory (RAM) is finite and shared. Without hardware-enforced isolation, a errant pointer in one application could corrupt kernel memory or read sensitive data belonging to another process.

Virtual Memory achieves three crucial objectives:
1. **Isolation and Protection**: Every user process is granted its own private, continuous address space starting at address 0. A process cannot access another process's physical memory unless explicitly shared.
2. **Efficient Physical Allocation**: Physical memory does not need to be contiguous. Small, fixed-size chunks of physical RAM (known as **Page Frames**) can back arbitrary virtual pages scattered anywhere.
3. **Overcommitment & Paging**: The operating system can allocate virtual address space far exceeding physical RAM capacity by temporarily swapping cold pages to secondary storage (SSD/Disk).

---

## 2. Paging Architecture & Multi-Level Page Tables
Paging divides virtual memory into fixed-sized blocks called **Virtual Pages** (typically 4 KB on x86-64 architecture). Physical memory is similarly divided into **Physical Frames** of identical size.

A 64-bit virtual address is split into two components:
- **Virtual Page Number (VPN)**: Used as an index into page tables to resolve the corresponding Physical Frame Number (PFN).
- **Page Offset**: The byte position within the 4 KB page. Because \`2^12 = 4096\`, the lower 12 bits represent the offset and pass directly through unchanged.

### Multi-Level Page Tables on x86-64
In a naive linear page table, an x86-64 system with a 48-bit active virtual address space would require \`2^36\` entries per process—costing upwards of 512 GB of RAM purely for bookkeeping!

Modern architectures solve this using **Multi-Level Page Tables** (e.g., 4-level paging on x86-64: PML4, PDPT, PD, PT). Multi-level paging creates a tree hierarchy:
- If a vast contiguous region of virtual memory is unmapped, entire subtrees of the page table are never allocated in RAM.
- Only regions actively allocated to the heap, stack, or code require leaf page table entries, drastically reducing memory overhead to just a few kilobytes for typical processes.

---

## 3. Hardware Acceleration: The Translation Lookaside Buffer (TLB)
A multi-level page table introduces severe performance penalties: resolving a single virtual memory read would require 4 sequential memory accesses to traverse the page table hierarchy before the actual data access occurs (a 400% slowdown).

To eliminate this bottleneck, CPU Memory Management Units (MMUs) incorporate a high-speed hardware cache called the **Translation Lookaside Buffer (TLB)**.
- **TLB Hit**: The MMU looks up the VPN in the TLB cache. If present, the PFN is retrieved within 1 clock cycle, and the physical address is constructed immediately without touching RAM.
- **TLB Miss**: If the translation is absent from the TLB, a page table walk must occur:
  - *Hardware-Managed TLB* (x86): The MMU hardware autonomously walks the multi-level page tables using the CR3 register, updates the TLB, and resumes execution.
  - *Software-Managed TLB* (MIPS/RISC): The CPU raises a TLB Miss trap, and an OS kernel handler manually traverses the page table and loads the entry into the TLB.

---

## 4. Page Faults and Demand Paging
When a virtual address is accessed whose Page Table Entry (PTE) has its **Valid/Present Bit** set to 0, the MMU triggers a hardware interrupt known as a **Page Fault** (Interrupt 14 on x86).

The OS Page Fault handler executes the following steps:
1. Save the faulting instruction pointer and register context.
2. Read the faulting virtual address from the CR2 register.
3. Check the process's Virtual Memory Area (VMA) struct:
   - If the address is invalid (e.g., dereferencing NULL or unmapped memory), issue a \`SIGSEGV\` (Segmentation Fault).
   - If the access violates permissions (e.g., writing to read-only code), issue a protection fault.
4. If the page is valid but swapped out to disk:
   - Find or allocate a free physical memory frame.
   - If physical RAM is full, execute a **Page Replacement Algorithm** to evict an existing victim page (writing it to swap if marked *Dirty*).
   - Issue asynchronous disk I/O to read the page from disk into the allocated frame.
   - Update the PTE with the new PFN, set the Present bit to 1, and invalidate the stale TLB entry.
5. Restart the instruction that triggered the fault.

---

## 5. Page Replacement Policies: LRU vs. Clock Algorithm
When RAM is saturated and a new page must be loaded, the OS must select a victim page to evict.
- **Optimal (Belady's MIN)**: Evicts the page that will not be used for the longest period in the future. Impossible to implement in practice because the future is unknown, but serves as a theoretical benchmark.
- **Least Recently Used (LRU)**: Evicts the page unused for the longest time in the past. True LRU requires hardware timestamps or doubly-linked list updates on *every* memory read/write, making it prohibitively expensive.
- **The Clock Algorithm (Second-Chance)**: A practical FIFO-based approximation of LRU.
  - Every page has an access/reference bit set by hardware whenever the page is read or written.
  - The OS maintains a circular buffer with a clock hand.
  - When looking for a victim, if the hand points to a page with reference bit = 1, it clears the bit to 0 and advances the hand (giving it a second chance).
  - If it encounters a page with reference bit = 0, that page is immediately selected for eviction.`,
    preloadedCheckpoints: [
      {
        chunkIndex: 1,
        question: "Why do modern 64-bit operating systems use multi-level page tables instead of a single flat linear array?",
        options: [
          "To avoid allocating page table pages for large unused spans of virtual address space",
          "Because linear arrays cannot be stored on NVMe SSD drives",
          "To enable encryption of virtual memory frames with AES-256",
          "Because 64-bit CPUs do not support pointer arithmetic"
        ],
        correctIndex: 0,
        explanation: "Multi-level page tables form a tree; unallocated virtual memory ranges require no subtree allocation, reducing memory footprint from 512 GB to a few kilobytes."
      },
      {
        chunkIndex: 2,
        question: "What is the primary function of the Translation Lookaside Buffer (TLB)?",
        options: [
          "A high-speed associative hardware cache that stores recent VPN-to-PFN translations",
          "A register that stores the process ID of the current running thread",
          "A disk buffer that batches page writes to SSD flash memory",
          "A hardware timer that triggers context switching every 10ms"
        ],
        correctIndex: 0,
        explanation: "The TLB is an on-chip hardware cache that maps virtual page numbers directly to physical frame numbers in ~1 clock cycle, avoiding multi-level RAM lookups."
      },
      {
        chunkIndex: 4,
        question: "How does the Clock (Second-Chance) page replacement algorithm approximate LRU efficiently?",
        options: [
          "It uses a circular pointer and clears the reference bit on pass; pages with 0 are evicted",
          "It records exact 64-bit timestamps on every memory instruction",
          "It randomly evicts any page that has been in memory for over 60 seconds",
          "It requires the programmer to explicitly tag unneeded variables in source code"
        ],
        correctIndex: 0,
        explanation: "The Clock algorithm sweeps through page frames in a circle; if reference bit is 1, it sets it to 0 (second chance). The first page with 0 is evicted."
      }
    ]
  },
  {
    id: "btree-vs-lsm",
    title: "Database Internals: B-Trees vs. LSM-Trees in Storage Engines",
    category: "Database Systems / CSE 444",
    description: "Examine write amplification, random vs. sequential I/O, write-ahead logs, compaction strategies (Leveled vs Size-Tiered), and read paths in RocksDB vs Postgres.",
    content: `# Database Internals: B-Trees vs. LSM-Trees in Storage Engines

## 1. The Storage Hierarchy & I/O Asymmetry
All database storage engines are fundamentally designed around the physics of storage media. Traditional Spinning Hard Disk Drives (HDDs) suffer from massive seek penalties (5–10 ms) during random I/O, while solid-state drives (SSDs) suffer from wear-leveling constraints and erase-block amplification during random in-place updates.

Across both media types, **sequential I/O** remains orders of magnitude faster and more wear-friendly than **random I/O**. This fundamental trade-off gives rise to two distinct architectural philosophies in database design:
1. **In-Place Update Engines (B-Trees)**: Optimize for lightning-fast reads and point lookups by keeping data strictly ordered on fixed-size disk blocks.
2. **Append-Only Engines (Log-Structured Merge-Trees / LSM)**: Optimize for blistering write throughput by converting all updates and inserts into sequential appends.

---

## 2. B+ Tree Storage Engines (PostgreSQL, MySQL InnoDB, SQLite)
A B+ Tree is a self-balancing $M$-way search tree where all data rows or primary key references reside strictly in the leaf nodes, while interior nodes store only routing keys and child pointers.

Key properties of B+ Trees include:
- **High Fanout**: Typically 100 to 1,000 pointers per node. A 3-level tree can index hundreds of millions of rows with only 3 disk hops.
- **Doubly-Linked Leaves**: Leaf pages form a contiguous linked list, making sequential range scans (\`WHERE id BETWEEN 100 AND 500\`) extremely fast.
- **Fixed Page Size**: Usually 8 KB (Postgres) or 16 KB (InnoDB), matching operating system virtual memory page multiples.

### The In-Place Update Cost & Write Amplification
When a row is updated in a B+ Tree, the entire 8 KB or 16 KB page containing that row must be written out to disk (via dirty page flush from the buffer pool). Modifying a single 20-byte string requires writing thousands of bytes to storage. Furthermore, to guard against half-written torn pages during power loss, engines must write twice: first to a sequential **Write-Ahead Log (WAL)**, and subsequently to the actual B-Tree page. This causes significant **Write Amplification**.

---

## 3. Log-Structured Merge-Trees (RocksDB, Cassandra, Bigtable)
LSM-Trees eliminate random writes entirely during ingestion by buffering writes in fast volatile RAM and periodically flushing immutable sequential runs to disk.

An LSM-Tree architecture consists of three core components:
1. **MemTable**: An in-memory sorted data structure (typically implemented as a concurrent SkipList or Red-Black Tree). All \`PUT\`, \`UPDATE\`, and \`DELETE\` operations are inserted directly into the MemTable.
2. **Write-Ahead Log (WAL)**: An append-only log on disk. Incoming writes are synchronously appended to the WAL before being inserted into the MemTable to guarantee durability across crashes.
3. **SSTables (Sorted String Tables)**: Immutable, sorted files stored on disk. When the MemTable exceeds a threshold (e.g. 64 MB), it is frozen, converted into a new SSTable, and flushed to storage sequentially.

Because SSTables are completely immutable, deletions cannot overwrite data in-place. Instead, LSM-Trees write a special marker called a **Tombstone**. The tombstone indicates the key is dead, and the actual reclamation occurs later during compaction.

---

## 4. The LSM Read Path & Bloom Filter Optimizations
While LSM-Trees achieve near-theoretical maximum write throughput, their read path is inherently more complex than a B-Tree:
To find a key, the engine must search:
1. The active mutable MemTable.
2. Any immutable MemTables currently being flushed.
3. All SSTable files on disk, from newest to oldest.

If a key does not exist, a naive LSM engine would have to perform disk reads against *every single SSTable file* across all levels!

### Bloom Filters: Guarding Against Wasted Reads
To solve this, LSM storage engines attach an in-memory **Bloom Filter** to each SSTable file. A Bloom filter is a space-efficient probabilistic data structure that answers set membership queries with zero false negatives:
- It can definitively state: *"This key is definitely NOT present in this SSTable file."* (allowing the engine to skip the disk I/O entirely).
- It may occasionally return: *"This key MIGHT be present."* (requiring a disk read to verify).

---

## 5. Compaction Strategies: Leveled vs. Size-Tiered
Over time, flushing SSTables accumulates hundreds of files on disk, causing read performance and disk utilization to degrade. The engine runs background **Compaction** threads to merge overlapping SSTables, discard tombstones, and deduplicate obsolete versions.

1. **Size-Tiered Compaction (STCS)**:
   - Groups SSTables of roughly equal size into tiers.
   - When a tier accumulates $N$ files (e.g., 4), they are merged sequentially into one larger SSTable at the next tier.
   - High write throughput, but high temporary space overhead (can require 50% free disk space during compaction).
2. **Leveled Compaction (LCS)**:
   - Data is organized into numbered levels ($L_0, L_1, L_2 \dots$), where each level is 10x larger than the previous level.
   - At $L_1$ and above, SSTables within the same level have strictly non-overlapping key ranges.
   - Guaranteed predictable point-lookup latency and lower space amplification, but higher background write amplification.`,
    preloadedCheckpoints: [
      {
        chunkIndex: 1,
        question: "Why do B+ Tree engines suffer from high Write Amplification on small row updates?",
        options: [
          "Modifying even a few bytes requires flushing the entire 8KB/16KB page to disk alongside WAL writes",
          "B+ Trees encrypt every row with three separate cryptographic keys",
          "Leaf nodes must be reconstructed completely from scratch upon every insert",
          "B+ Trees require replicating data across at least 5 secondary indexes"
        ],
        correctIndex: 0,
        explanation: "Because B+ Trees update in-place on fixed pages (8-16KB), writing a tiny update causes an entire page write plus WAL entry, multiplying physical I/O."
      },
      {
        chunkIndex: 2,
        question: "How do LSM-Trees handle record deletion without modifying immutable SSTables on disk?",
        options: [
          "They write an append-only 'Tombstone' marker that shadows earlier versions until compaction",
          "They immediately truncate the SSTable file at the deleted record's offset",
          "They rewrite the entire database partition synchronously on the delete call",
          "They trigger a hardware interrupt that zeroes out the disk sectors"
        ],
        correctIndex: 0,
        explanation: "LSM-Trees append a Tombstone marker. Future reads see the tombstone and treat the key as deleted; physical removal happens later during SSTable compaction."
      },
      {
        chunkIndex: 3,
        question: "What critical guarantee does a Bloom Filter provide for the LSM-Tree read path?",
        options: [
          "Zero false negatives: if it says a key is absent, disk I/O for that SSTable can be skipped safely",
          "Exact count of duplicate keys across all levels in constant time",
          "Sub-millisecond write buffer serialization to the Write-Ahead Log",
          "Automatic encryption of memory mapped files on Linux"
        ],
        correctIndex: 0,
        explanation: "Bloom filters have zero false negatives. If the filter reports a key is absent, the engine guarantees the key is not in that SSTable and avoids reading it from disk."
      }
    ]
  }
];
