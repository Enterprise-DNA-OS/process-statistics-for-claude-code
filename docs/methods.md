# Methods and limits

The supported scope is descriptive statistics, individuals and moving-range limits, and overall Pp/Ppk using sample standard deviation. There is no hypothesis testing, design of experiments, multivariate analysis, forecasting, measurement-system study or production-release decision.

Descriptive statistics use Welford accumulation for the sample mean and sample variance with denominator n-1. Median is the middle ordered value, or the mean of the two middle values. Missing measurements are retained as null and excluded from numerical summaries. No coercion of text to zero is allowed.

Individuals analysis orders measurements by timestamp and source row number. The mean moving range is the mean absolute change between adjacent valid observations. A missing observation breaks adjacency. The within estimate is mean moving range / 1.128. Individuals limits are mean +/- 3 times that estimate. Moving-range upper limit is 3.267 times mean moving range. The moving-range lower limit is zero. Only observations beyond those limits are signalled. Other run rules are not implemented. A constant series cannot estimate variation and is rejected.

A saved individuals analysis can supply fixed center and variation to a later series for the same process. The baseline and measurement fingerprints are recorded in every saved result. Baselines require an operator to assess stable conditions, sampling order, independence and representativeness. Recording an analysis is not approval or authenticated sign-off. Current-series estimates are exploratory, not evidence that a process is stable.

Overall performance uses sample standard deviation s, without the optional bias correction some software settings use. Pp = (upper specification - lower specification) / (6s). Ppk = min((upper specification - mean)/(3s), (mean - lower specification)/(3s)). These are overall Pp/Ppk, not within-subgroup Cp/Cpk. There is no normality test, distribution fitting, confidence interval or automatic stability test. Review normality, representativeness and stability before interpreting them. Negative Ppk is retained when the mean is outside specifications. Zero variation is rejected, never reported as infinite capability. Values equal to a specification limit are inside.

The fewer-than-20 observations warning for control limits and fewer-than-50 warning for capability are local review prompts, not legal requirements or proof that larger samples suffice. No statement certifies compliance, validates software for regulated submissions, or releases a batch.

Sources, opened 29 October 2026:

- [NIST individuals control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm).
- [NIST process capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm).
- [Minitab explanation of overall versus within variation](https://blog.minitab.com/en/blog/how-cpk-and-ppk-are-calculated2c-part-1).

Tests compare explicit independent numeric expectations, including a shifted process against a fixed baseline, missing observations, negative capability, zero variance and malformed inputs. No claim of parity with every Minitab setting is made.
