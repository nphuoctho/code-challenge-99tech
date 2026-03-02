# Problem 3: Messy React

## Task

List out the computational inefficiencies and anti-patterns found in the code block below.

1. This code block uses
   1. ReactJS with TypeScript.
   2. Functional components.
   3. React Hooks
2. You should also provide a refactored version of the code, but more points are awarded to accurately stating the issues and explaining correctly how to improve them.

```ts
interface WalletBalance {
  currency: string;
  amount: number;
}
interface FormattedWalletBalance {
  currency: string;
  amount: number;
  formatted: string;
}

interface Props extends BoxProps {}
const WalletPage: React.FC<Props> = (props: Props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  const getPriority = (blockchain: any): number => {
    switch (blockchain) {
      case "Osmosis":
        return 100;
      case "Ethereum":
        return 50;
      case "Arbitrum":
        return 30;
      case "Zilliqa":
        return 20;
      case "Neo":
        return 20;
      default:
        return -99;
    }
  };

  const sortedBalances = useMemo(() => {
    return balances
      .filter((balance: WalletBalance) => {
        const balancePriority = getPriority(balance.blockchain);
        if (lhsPriority > -99) {
          if (balance.amount <= 0) {
            return true;
          }
        }
        return false;
      })
      .sort((lhs: WalletBalance, rhs: WalletBalance) => {
        const leftPriority = getPriority(lhs.blockchain);
        const rightPriority = getPriority(rhs.blockchain);
        if (leftPriority > rightPriority) {
          return -1;
        } else if (rightPriority > leftPriority) {
          return 1;
        }
      });
  }, [balances, prices]);

  const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
    return {
      ...balance,
      formatted: balance.amount.toFixed(),
    };
  });

  const rows = sortedBalances.map(
    (balance: FormattedWalletBalance, index: number) => {
      const usdValue = prices[balance.currency] * balance.amount;
      return (
        <WalletRow
          className={classes.row}
          key={index}
          amount={balance.amount}
          usdValue={usdValue}
          formattedAmount={balance.formatted}
        />
      );
    }
  );

  return <div {...rest}>{rows}</div>;
};
```

## Issues Found

### 1. Bug: `lhsPriority` is used but never declared

```ts
const balancePriority = getPriority(balance.blockchain);
if (lhsPriority > -99) { // lhsPriority is undefined — runtime error
```

`lhsPriority` was never declared. The variable computed just above is `balancePriority`, which is what should be used here.

**Fix:** Replace `lhsPriority` with `balancePriority`.

---

### 2. Bug: Filter logic is inverted — keeps balances with `amount <= 0`

```ts
if (balance.amount <= 0) {
  return true; // keeps zero/negative balances — wrong
}
```

The intent is to show only balances with a positive amount, but the condition is backwards.

**Fix:** Change to `balance.amount > 0`.

---

### 3. Bug: `sort()` comparator has no return value when priorities are equal

```ts
if (leftPriority > rightPriority) return -1;
else if (rightPriority > leftPriority) return 1;
// implicitly returns undefined when equal — undefined behavior in some engines
```

A sort comparator must always return a number. Returning `undefined` leads to unpredictable sort order.

**Fix:** Use subtraction: `return rightPriority - leftPriority`.

---

### 4. Bug: `classes` is used but never defined

```ts
<WalletRow
  className={classes.row} // classes is never declared anywhere in this component
/>
```

`classes` is referenced as if it were provided by a CSS-in-JS library (e.g. `makeStyles` from MUI), but it's never imported or initialized. This throws a runtime error the moment `rows` is rendered.

**Fix:** Define `classes` using your styling solution, or replace it with a plain string:

```ts
// Option A — MUI makeStyles
const useStyles = makeStyles({ row: { /* styles */ } });
const classes = useStyles();

// Option B — plain CSS class name
<WalletRow className="wallet-row" ... />

// Option C - CSS Modules
import classes from "./WalletPage.module.css";
```

---

### 5. Performance: `getPriority` is redefined on every render

```ts
const getPriority = (blockchain: any): number => { ... }
```

This function is declared inside the component but doesn't use any state or props, so it's recreated unnecessarily on every render.

**Fix:** Move it outside the component. It becomes a plain module-level function.

---

### 6. Performance: `prices` is in the `useMemo` dependency array but isn't used inside

```ts
}, [balances, prices]); // prices is not read in this memo block
```

This causes `sortedBalances` to recompute every time `prices` changes, even though the result doesn't depend on it.

**Fix:** Remove `prices` from the dependency array.

---

### 7. Logic: `formattedBalances` is computed but never used

```ts
const formattedBalances = sortedBalances.map(...); // computed here...

const rows = sortedBalances.map((balance: FormattedWalletBalance, index) => {
  formattedAmount={balance.formatted} // ...but rows uses sortedBalances, so balance.formatted is undefined
});
```

`formattedBalances` is created, then ignored. `rows` maps over `sortedBalances` instead, so `balance.formatted` is always `undefined`.

**Fix:** Merge the formatting step into the `sortedBalances` pipeline and use the result in `rows`.

---

### 8. Performance: `rows` is not memoized

```ts
const rows = sortedBalances.map(...); // runs on every render
```

Even if `sortedBalances` and `prices` haven't changed, `rows` is rebuilt on every render.

**Fix:** Wrap in `useMemo` with `[sortedBalances, prices]` as dependencies.

---

### 9. Anti-pattern: Using array `index` as `key`

```ts
key = { index };
```

Using index as key causes React to misidentify elements when the list changes (reorders, inserts, removals), leading to subtle rendering bugs.

**Fix:** Use `balance.currency` or another stable unique identifier.

---

### 10. Type: `blockchain` is typed as `any`

```ts
const getPriority = (blockchain: any): number => {
```

Using `any` defeats the purpose of TypeScript. Typos or invalid blockchain names won't be caught at compile time.

**Fix:** Define a union type `type Blockchain = "Osmosis" | "Ethereum" | "Arbitrum" | "Zilliqa" | "Neo"` and use it.

---

### 11. Type: `WalletBalance` interface is missing the `blockchain` field

```ts
interface WalletBalance {
  currency: string;
  amount: number;
  // blockchain is used in filter/sort but not declared here
}
```

The code accesses `balance.blockchain` in the filter and sort steps, but the interface doesn't include it. TypeScript would flag this if the type were correct.

**Fix:** Add `blockchain: Blockchain` to the `WalletBalance` interface.
