import { GoldCoinIcon } from "@/features/pet-home/components/GoldCoinIcon";
import { coinsLabel } from "@/features/pet-home/pet-coins";
import styles from "./CoinBalance.module.css";

type Props = {
  balance: number;
  showAdd?: boolean;
};

/** Gold coin badge for chrome (header). `showAdd` stays off until a real top-up exists. */
export function CoinBalance({ balance, showAdd = false }: Props) {
  return (
    <div className={styles.coinBalance} aria-label={coinsLabel(balance)}>
      <GoldCoinIcon className={styles.coinIcon} />
      <span className={styles.coinAmount} aria-hidden="true">
        {balance}
      </span>
      {showAdd ? (
        <span className={styles.coinAdd} aria-hidden="true">
          +
        </span>
      ) : null}
    </div>
  );
}
