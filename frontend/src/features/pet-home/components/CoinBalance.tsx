import { GoldCoinIcon } from "@/features/pet-home/components/GoldCoinIcon";
import { coinsLabel } from "@/features/pet-home/pet-coins";
import styles from "./pet-home.module.css";

type Props = {
  balance: number;
};

/** Gold coin badge showing the local balance. */
export function CoinBalance({ balance }: Props) {
  return (
    <div className={styles.coinBalance} aria-label={coinsLabel(balance)}>
      <GoldCoinIcon className={styles.coinIcon} />
      <span className={styles.coinAmount} aria-hidden="true">
        {balance}
      </span>
    </div>
  );
}
