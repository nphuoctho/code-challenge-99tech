import { FC, useMemo } from "react";

type Blockchain = "Osmosis" | "Ethereum" | "Arbitrum" | "Zilliqa" | "Neo";

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain;
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

// Defined outside the component — pure function, no dependency on state or props
const BLOCKCHAIN_PRIORITY: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

const getPriority = (blockchain: string): number =>
  BLOCKCHAIN_PRIORITY[blockchain] ?? -99;

interface Props extends BoxProps {}

const WalletPage: FC<Props> = (props: Props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // Only depends on balances — prices is not used here
  const sortedBalances = useMemo<FormattedWalletBalance[]>(() => {
    return balances
      .filter((balance: WalletBalance) => {
        const priority = getPriority(balance.blockchain);
        return priority > -99 && balance.amount > 0; // keep only supported chains with a positive amount
      })
      .sort((lhs: WalletBalance, rhs: WalletBalance) => {
        return getPriority(rhs.blockchain) - getPriority(lhs.blockchain); // subtraction handles the equal case correctly
      })
      .map((balance: WalletBalance) => ({
        // format amount here — no need for a separate formattedBalances variable
        ...balance,
        formatted: balance.amount.toFixed(2),
      }));
  }, [balances]);

  // Memoize rows so they're only recomputed when data actually changes
  const rows = useMemo(
    () =>
      sortedBalances.map((balance: FormattedWalletBalance) => {
        const usdValue = prices[balance.currency] * balance.amount;
        return (
          <WalletRow
            className="wallet-row"
            key={balance.currency} // stable, unique key — avoids index-as-key anti-pattern
            amount={balance.amount}
            usdValue={usdValue}
            formattedAmount={balance.formatted}
          />
        );
      }),
    [sortedBalances, prices]
  );

  return <div {...rest}>{rows}</div>;
};

export default WalletPage;
